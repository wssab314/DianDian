import asyncio
import os
import json
import base64
import tempfile
from http import HTTPStatus
from typing import Dict, Any
import dashscope
from dashscope import MultiModalConversation
from .base import PerceptionStrategy

class VisionPerceptionStrategy(PerceptionStrategy):
    def __init__(self):
        self.model = "qwen-vl-max"

    def _save_base64_to_temp(self, base64_str):
        # Decode base64 string to bytes
        img_data = base64.b64decode(base64_str)
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(img_data)
        temp_file.close()
        return temp_file.name

    def _call_api(self, messages):
        return MultiModalConversation.call(
            model=self.model,
            messages=messages,
            result_format='message'
        )

    async def perceive(self, step: str, goal: str, history_str: str, **kwargs) -> Dict[str, Any]:
        screenshot_base64 = kwargs.get("screenshot")
        if not screenshot_base64:
             return {"action": "fail", "thought": "No screenshot provided", "confidence": 0.0}

        temp_img_path = self._save_base64_to_temp(screenshot_base64)
        img_uri = f"file://{temp_img_path}"

        prompt = f"""
        # Role
        你是一个拥有视觉感知能力的 AI 网页测试代理。你的任务是根据用户的【目标】和【当前截图】，决定下一步的浏览器操作。

        # 核心规则 (Critical Rules)
        1. **SoM定位**: 截图中的可交互元素已被【红色数字 ID】标记。你 **必须且只能** 操作这些有标记的元素。严禁臆造不存在的 ID。
        2. **场景自适应**: 
           - **弹窗**: 如果遇到遮挡视线的弹窗（如广告、登录提示、Cookie条），**优先** 寻找 ID 点击关闭或跳过，除非任务明确要求登录。
           - **长页面**: 如果目标元素不在当前视野内（例如搜索结果在下方），请使用 `scroll` "down" 或 "bottom"（如果目标在页尾）。
           - **完成态**: 如果页面内容已经完全满足【目标】，请立即返回 `done`。
        3. **输入规范**: 对于 `type` 操作，`param`必须是完整的输入内容。

        # 当前上下文
        - **用户目标**: {goal}
        - **当前小步骤**: {step}
        - **历史操作**: {history_str}

        # 动作空间 (Action Space)
        - `click`: 点击元素。需提供 `target_id`。
        - `type`: 输入文本。需提供 `target_id` 和 `param`(文本内容)。
        - `scroll`: 滚动页面。`param` 为 "up", "down", "top" 或 "bottom"。无需 `target_id`。
        - `navigate`: 访问URL。`param`为网址。无需 `target_id`。
        - `back`: 浏览器后退。
        - `hover`: 鼠标悬停。需提供 `target_id`。
        - `done`: 任务完成。
        - `fail`: 无法继续或发生错误。

        # 输出格式 (JSON)
        请进行简短的【分析与思考】，然后输出 JSON：
        {{
            "thought": "观察：当前是百度首页... 策略：点击ID=5。",
            "action": "click",
            "target_id": 5,
            "param": null,
            "confidence": 1.0
        }}
        """

        messages = [
            {"role": "system", "content": [{"text": "你是一个Web自动化测试代理。请根据截图和任务进行操作。"}]},
            {"role": "user", "content": [{"image": img_uri}, {"text": prompt}]}
        ]

        print(f"[VisionStrategy] Calling Qwen-VL-Max (Timeout: 60s)...")
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(self._call_api, messages),
                timeout=60.0
            )
            
            # Cleanup
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)

            if response.status_code == HTTPStatus.OK:
                content = response.output.choices[0].message.content[0]['text']
                data = self._parse_json(content)
                data["confidence"] = data.get("confidence", 0.9) # VL usually confident
                return data
            else:
                print(f"[VisionStrategy] Error: {response.code} - {response.message}")
                return {"action": "fail", "thought": f"API Error: {response.message}", "confidence": 0.0}

        except asyncio.TimeoutError:
             print("[VisionStrategy] Timeout Error (60s)")
             if os.path.exists(temp_img_path):
                 os.remove(temp_img_path)
             return {"action": "fail", "thought": "L2 Analysis Timeout", "confidence": 0.0}
        except Exception as e:
            print(f"[VisionStrategy] Exception: {e}")
            if os.path.exists(temp_img_path):
                 os.remove(temp_img_path)
            return {"action": "fail", "thought": f"Exception: {str(e)}", "confidence": 0.0}

    def _parse_json(self, content):
        try:
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            print(f"[VisionStrategy] JSON Parse Failed: {content}")
            return {"action": "fail", "thought": "Failed to parse model output", "confidence": 0.0}
