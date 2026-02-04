import os
import json
import base64
import tempfile
from http import HTTPStatus
import dashscope
from dashscope import MultiModalConversation

# Load Env
from dotenv import load_dotenv
load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

class QwenExecutor:
    def __init__(self):
        self.model = "qwen-vl-max"

    def _save_base64_to_temp(self, base64_str):
        # Remove header if present
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
            
        img_data = base64.b64decode(base64_str)
        tfile = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        tfile.write(img_data)
        tfile.close()
        return tfile.name

    async def decide_action(self, screenshot_base64, current_step, goal, history_str):
        """
        Input lines:
        - screenshot_base64: The current screen.
        - current_step: The specific micro-task to focus on.
        - goal: The overall user goal.
        - history_str: What we have done so far.
        """
        
        temp_img_path = self._save_base64_to_temp(screenshot_base64)
        img_uri = f"file://{temp_img_path}" # SDK handles file://

        debug_img_path = os.path.join(os.path.dirname(__file__), "../../last_screenshot.png")
        # os.rename(temp_img_path, debug_img_path) # debug only

        prompt = f"""
        当前任务目标: {goal}
        当前执行步骤: {current_step}
        历史操作: {history_str}
        
        请仔细观察截图中的红色数字标记(SoM)。判断下一步该做什么。
        如果当前页面不符合预期或报错，请返回 action: "fail"。
        如果任务已完成，返回 action: "done"。
        
        请严格输出如下JSON格式:
        {{
            "thought": "你的思考过程",
            "action": "click" | "type" | "scroll" | "navigate" | "done" | "fail",
            "param": "ID(数字) 或 输入内容(字符串) 或 URL",
            "target_id": 12 (如果是点击或输入，必须提供SoM ID)
        }}
        """

        messages = [
            {
                "role": "system",
                "content": [{"text": "你是一个Web自动化测试代理。请根据截图和任务进行操作。"}]
            },
            {
                "role": "user",
                "content": [
                    {"image": img_uri},
                    {"text": prompt}
                ]
            }
        ]

        print(f"[Executor] Calling Qwen-VL-Max...")
        try:
            response = MultiModalConversation.call(
                model=self.model,
                messages=messages,
                result_format='message'
            )
            
            # Cleanup temp file
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)

            if response.status_code == HTTPStatus.OK:
                content = response.output.choices[0].message.content[0]['text']
                print(f"[Executor] Raw Response: {content}")
                return self._parse_json(content)
            else:
                print(f"[Executor] Error: {response.code} - {response.message}")
                return {"action": "fail", "thought": f"API Error: {response.message}"}

        except Exception as e:
            print(f"[Executor] Exception: {e}")
            return {"action": "fail", "thought": f"Exception: {str(e)}"}

    def _parse_json(self, content):
        try:
            # Strip markdown
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        except Exception as e:
            print(f"[Executor] JSON Parse Failed: {content}")
            return {"action": "fail", "thought": "Failed to parse model output"}
