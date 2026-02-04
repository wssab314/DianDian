import os
import json
import dashscope
from dashscope import Generation

# Load Env
from dotenv import load_dotenv
load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

class QwenPlanner:
    def __init__(self):
        self.model = "qwen-max"

    async def plan_task(self, user_objective):
        prompt = f"""
        你是一个QA测试专家。用户想要进行如下测试任务：
        "{user_objective}"
        
        请将其拆解为执行步骤。每一步应该是一个简单的原子操作。
        
        输出JSON格式：
        {{
            "steps": [
                "步骤1描述",
                "步骤2描述"
            ]
        }}
        """

        messages = [
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            {'role': 'user', 'content': prompt}
        ]

        print(f"[Planner] Decomposing: {user_objective}")
        try:
            response = Generation.call(
                model=self.model,
                messages=messages,
                result_format='message'
            )

            if response.status_code == 200:
                content = response.output.choices[0].message.content
                print(f"[Planner] Response: {content}")
                return self._parse_json(content)
            else:
                print(f"[Planner] Error: {response.code} - {response.message}")
                return {"steps": []}
                
        except Exception as e:
            print(f"[Planner] Exception: {e}")
            return {"steps": []}

    def _parse_json(self, content):
        try:
            # 1. Attempt clean parse
            text = content.replace("```json", "").replace("```", "").strip()
            # 2. Heuristic: find first '{' and last '}'
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start:end+1]
            return json.loads(text)
        except Exception as e:
            print(f"[Planner] JSON fail: {content[:100]}... Error: {e}")
            # Fallback: Try to split by newlines if it looks like a list
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            return {"steps": lines}
