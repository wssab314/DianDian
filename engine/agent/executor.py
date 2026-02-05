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

        # Role
        你是一个拥有视觉感知能力的 AI 网页测试代理。你的任务是根据用户的【目标】和【当前截图】，决定下一步的浏览器操作。

        # 核心规则 (Critical Rules)
        1. **SoM定位**: 截图中的可交互元素已被【红色数字 ID】标记。你 **必须且只能** 操作这些有标记的元素。严禁臆造不存在的 ID。
        2. **场景自适应**: 
           - **弹窗**: 如果遇到遮挡视线的弹窗（如广告、登录提示、Cookie条），**优先** 寻找 ID 点击关闭或跳过，除非任务明确要求登录。
           - **长页面**: 如果目标元素不在当前视野内（例如搜索结果在下方），请使用 `scroll` "down"。
           - **完成态**: 如果页面内容已经完全满足【目标】，请立即返回 `done`。
        3. **输入规范**: 对于 `type` 操作，`param`必须是完整的输入内容。

        # 当前上下文
        - **用户目标**: {goal}
        - **当前小步骤**: {current_step}
        - **历史操作**: {history_str}

        # 动作空间 (Action Space)
        - `click`: 点击元素。需提供 `target_id`。
        - `type`: 输入文本。需提供 `target_id` 和 `param`(文本内容)。
        - `scroll`: 滚动页面。`param` 为 "up" 或 "down"。无需 `target_id`。
        - `navigate`: 访问URL。`param`为网址。无需 `target_id`。
        - `back`: 浏览器后退。
        - `hover`: 鼠标悬停。需提供 `target_id`。
        - `done`: 任务完成。
        - `fail`: 无法继续或发生错误。

        # 输出格式 (JSON)
        请进行简短的【分析与思考】，然后输出 JSON：
        {{
            "thought": "观察：当前是百度首页，有遮挡弹窗。策略：先点击 ID=5 关闭弹窗。",
            "action": "click",
            "target_id": 5,
            "param": null
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
