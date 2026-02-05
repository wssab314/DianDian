import asyncio
import os
import json
from typing import Dict, Any
from http import HTTPStatus
import dashscope
from .base import PerceptionStrategy

class TextPerceptionStrategy(PerceptionStrategy):
    # ... (init remains same)

    def _call_api(self, messages):
        return dashscope.Generation.call(
            model=self.model,
            messages=messages,
            result_format='message',
        )

    async def perceive(self, step: str, goal: str, history_str: str, **kwargs) -> Dict[str, Any]:
        aria_snapshot = kwargs.get("aria_snapshot")
        if not aria_snapshot:
            return {"action": "pass", "thought": "No aria_snapshot provided", "confidence": 0.0}

        prompt = f"""
        # Role
        You are a Web Automation Agent. Your task is to analyze the Accessibility Tree (Aria Snapshot) and determine the DOM Element to interact with.

        # Context
        - User Goal: {goal}
        - Current Step: {step}
        - History: {history_str}

        # DOM Tree (Aria Snapshot)
        {aria_snapshot}

        # Action Space
        - `click`: Click an element. Provide `selector` (Playwright locator or Regex name).
        - `type`: Input text. Provide `selector` and `param` (text).
        - `scroll`: "up" or "down".
        - `navigate`: "url"
        - `done`: Task completed.
        - `fail`: Cannot find element or unsure.

        # Critical Rules
        1. **Prefer Role Selectors**: Use specific text locators like `role=button[name='Search']` or `text='Login'`.
        2. **Confident Only**: If the element is not clearly visible in the tree, return `fail`.
        3. **Confidence**: Rate your confidence 0.0-1.0. If < 0.7, I will switch to Vision Mode.

        # Output JSON
        {{
            "thought": "I see a 'Search' button in the banner.",
            "action": "click",
            "selector": "role=button[name='Search']", 
            "param": null,
            "confidence": 0.95
        }}
        """

        messages = [
            {'role': 'system', 'content': 'You are a helpful web agent.'},
            {'role': 'user', 'content': prompt}
        ]

        try:
            print("[TextStrategy] Calling Qwen-Max (Timeout: 30s)...")
            response = await asyncio.wait_for(
                asyncio.to_thread(self._call_api, messages),
                timeout=30.0
            )

            if response.status_code == HTTPStatus.OK:
                content = response.output.choices[0].message.content
                return self._parse_json(content)
            else:
                print(f"[TextStrategy] API Error: {response.code} - {response.message}")
                return {"action": "fail", "thought": f"API Error", "confidence": 0.0}
        
        except asyncio.TimeoutError:
             print("[TextStrategy] Timeout Error (30s)")
             return {"action": "fail", "thought": "L1 Analysis Timeout", "confidence": 0.0}
        except Exception as e:
            print(f"[TextStrategy] Exception: {e}")
            return {"action": "fail", "thought": f"Exception: {str(e)}", "confidence": 0.0}

    def _parse_json(self, content):
        try:
            content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            # Normalize
            if "confidence" not in data:
                data["confidence"] = 0.5
            return data
        except Exception as e:
            print(f"[TextStrategy] JSON Parse Failed: {content}")
            return {"action": "fail", "thought": "Parse Error", "confidence": 0.0}
