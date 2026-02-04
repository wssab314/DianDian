基于 **Qwen 模型**，我们将设计一个 **“双脑协同” (Dual-Brain)** 的 Agent 架构。

---

# DianDian Agent 核心设计方案 (基于通义千问)

## 1. 模型选型与分工

为了平衡成本、速度与精度，我们不使用单一模型，而是采用 **“分层决策”**：

| 角色                  | 对应模型                   | 职责描述                                                     |
| :-------------------- | :------------------------- | :----------------------------------------------------------- |
| **Planner (规划者)**  | **qwen-max** (文本模型)    | **大脑**。负责理解用户意图、拆解任务步骤、生成验收标准、处理报错逻辑。它不看图，只看文本日志和 DOM 摘要。 |
| **Executor (执行者)** | **qwen-vl-max** (视觉模型) | **眼睛与手**。负责“看”当前屏幕（截图），结合 Planner 的指令，决定点击哪个坐标或哪个元素。 |

> **选择理由：**
> *   `qwen-max`：逻辑推理能力最强，适合处理复杂的测试流程控制。
> *   `qwen-vl-max`：拥有千万像素分辨率的视觉理解能力，能精准识别网页上的按钮、图标和文字，是替代传统 CSS Selector 的关键。

---

## 2. Agent 核心工作流 (The Loop)

我们将采用 **ReAct (Reasoning + Acting)** 模式的变体。

### 流程图解
1.  **用户输入** -> 2. **Planner 拆解** -> 3. **循环执行 (Loop)** -> 4. **视觉感知** -> 5. **Executor 决策** -> 6. **Playwright 执行** -> 7. **结果回传**

### 详细步骤设计

#### 第一步：感知 (Perception) - 构建 Prompt 上下文
当 Agent 需要行动时，Python 后端会收集以下信息：
1.  **截图 (Screenshot):** 经过压缩的高清截图。
2.  **视觉标记 (SoM - Set of Mark):** *强烈建议保留此步骤*。虽然 `qwen-vl-max` 可以直接读图，但在元素密集区域，给元素打上数字标签（1, 2, 3...）能极大提高点击准确率。
3.  **HTML 简要:** 提取当前视口内的关键 `<a>`, `<button>`, `<input>` 文本，作为辅助文本信息。

#### 第二步：决策 (Decision) - 调用 Qwen-VL
我们将构造一个多模态的消息发送给 `qwen-vl-max`。

**Prompt 结构示例：**
```json
{
  "model": "qwen-vl-max",
  "messages": [
    {
      "role": "system",
      "content": "你是一个资深的Web测试专家。你的任务是根据用户的目标和当前的屏幕截图，操作浏览器。请仔细观察截图中的数字标记（Set-of-Mark）。"
    },
    {
      "role": "user",
      "content": [
        {"image": "base64_encoded_screenshot_with_tags"},
        {"text": "当前任务目标：点击‘登录’按钮。\n历史操作：已输入用户名。\n请输出下一步动作。"}
      ]
    }
  ]
}
```

#### 第三步：动作空间 (Action Space) - 定义输出 Schema
为了让 Agent 的输出可被代码执行，我们需要定义一套 **工具集 (Tools)**。Qwen 支持 Tool Calling，或者我们可以强制要求它输出 JSON。

**定义的动作指令 (JSON Schema):**
```json
{
  "action": "click" | "type" | "scroll" | "wait" | "done" | "fail",
  "target_id": 12,  // 对应 SoM 标记的数字 ID
  "text": "password123", // 仅在 type 时需要
  "reasoning": "我看到ID为12的元素是登录按钮，符合当前目标。"
}
```

#### 第四步：执行与验证
Python 解析 JSON -> 映射 `target_id` 到 Playwright 的 Locator -> 执行 `click()`。

---

## 3. 详细 Prompt 设计 (针对 Qwen 优化)

### 3.1 Executor Prompt (视觉执行)
这是最核心的部分，直接决定了“点点”准不准。

```python
EXECUTOR_SYSTEM_PROMPT = """
你是一个基于视觉浏览器的自动化测试代理。
你将接收一张网页截图，图中关键元素已被红色边框和数字ID标记。

### 你的能力：
1. Click: 点击某个ID的元素。
2. Type: 在某个ID的输入框输入文本。
3. Scroll: 滚动页面查找元素。
4. Done: 任务已完成。

### 输出格式：
必须严格返回如下JSON格式，不要包含Markdown代码块：
{
    "thought": "简短的思考过程，描述你看到了什么，为什么要操作这个元素",
    "action": "click", 
    "param": 15 
}

### 注意事项：
- 优先关注截图中的红色数字标签。
- 如果目标不在当前视野，请执行 Scroll。
- 如果出现弹窗遮挡，优先关闭弹窗。
"""
```

### 3.2 Planner Prompt (任务规划 - 纯文本)
用于处理复杂逻辑，使用 `qwen-max`。

```python
PLANNER_SYSTEM_PROMPT = """
你是一个QA测试主管。用户会给你一个模糊的测试需求（例如“测试购物车流程”）。
你需要：
1. 将需求拆解为原子步骤（Step-by-step）。
2. 每一步都要定义“预期结果”。
3. 如果执行失败，根据Executor返回的错误日志分析原因，并决定是重试还是报错。

当前用户需求：{user_goal}
"""
```

---

## 4. 代码实现示例 (Python)

这里展示如何使用 `dashscope` (阿里云百炼 SDK) 实现核心的 Executor 环节。

**安装依赖：**
```bash
pip install dashscope playwright
```

**Executor 实现 (`engine/agent/executor.py`)：**

```python
import base64
from http import HTTPStatus
import dashscope
from dashscope import MultiModalConversation

# 配置你的 API Key
dashscope.api_key = "YOUR_ALIYUN_API_KEY"

def decide_next_action(screenshot_base64, prompt_text):
    """
    调用 Qwen-VL-Max 进行视觉决策
    """
    
    # 构造多模态消息
    messages = [
        {
            "role": "system",
            "content": [{"text": "你是一个能够精确操作浏览器的AI助手。请根据截图上的数字标签进行操作。只输出JSON。"}]
        },
        {
            "role": "user",
            "content": [
                {"image": f"data:image/png;base64,{screenshot_base64}"}, # 注意：Qwen SDK支持本地路径或URL，Base64需特定处理或上传OSS，此处为伪代码逻辑
                {"text": prompt_text}
            ]
        }
    ]

    # 调用 Qwen-VL-Max
    response = MultiModalConversation.call(
        model='qwen-vl-max',
        messages=messages,
        result_format='message',
    )

    if response.status_code == HTTPStatus.OK:
        content = response.output.choices[0].message.content[0]['text']
        # 这里需要增加 JSON 解析的健壮性处理
        return parse_json(content)
    else:
        print(f"Error: {response.code} - {response.message}")
        return None

def parse_json(content):
    # 简单的清理逻辑，防止模型输出 ```json ... ```
    content = content.replace("```json", "").replace("```", "").strip()
    import json
    return json.loads(content)
```

> **注意：** 阿里云 Qwen-VL API 对图片输入方式有要求（通常推荐传入公网 URL 或 OSS 路径）。
> **对于本地客户端（DianDian）的解决方案：**
> 由于我们在本地运行，无法直接提供公网 URL。
> **方案 A (官方推荐):** 使用 `dashscope` SDK 的本地文件上传功能（SDK会自动处理上传到临时空间）。
> **方案 B (Base64):** 检查 `qwen-vl-max` 最新 API 文档是否原生支持 Base64 数据流（目前部分版本支持，若不支持则必须走方案 A）。

---

## 5. 记忆与上下文管理 (Memory)

由于图像 Token 消耗巨大，我们不能把每一步的历史截图都发给模型。

**策略：只保留“当前状态” + “文本历史”**

发送给 `qwen-vl-max` 的 Messages 结构应该是：
1.  **System Prompt** (固定)
2.  **History Summary** (文本): "前序步骤：1. 已点击登录; 2. 已输入账号; 3. 点击提交失败，提示验证码错误。"
3.  **Current Image** (当前截图)
4.  **Current Goal** (文本): "当前目标：重新输入验证码。"

**不发送**之前的截图。这样既节省成本，又能保证模型专注于当下。

---

## 6. 异常处理与自愈 (Self-Healing)

Qwen 可能会犯错（幻觉），比如点击了一个不存在的 ID。

**设计逻辑：**
1.  **Playwright 执行层捕获错误：** 如果 Python 尝试点击 ID=15，但 DOM 中没有这个 ID。
2.  **反馈循环：** Python 不抛出异常，而是将错误信息生成一段新的 Prompt。
    *   *Prompt:* "操作失败。你刚才试图点击 ID 15，但该元素不可见。请重新观察截图，是否有其他替代元素？"
3.  **重试 (Max Retries = 3):** 让 Qwen 重新思考一次。

---

## 7. 总结

基于 Qwen 的 Agent 设计优势在于：

1.  **中文理解能力强：** 对于国内网站的测试（中文按钮、中文报错），Qwen-VL-Max 比 GPT-4o 有时更准确。
2.  **成本可控：** 相比 GPT-4o，Token 价格更具优势，适合高频的测试场景。
3.  **架构清晰：**
    *   **大脑 (Qwen-Max)** 处理流程。
    *   **眼睛 (Qwen-VL-Max)** 处理交互。
    *   **手 (Playwright)** 处理执行。

这个 Agent 设计完全可以嵌入到你之前的 **Electron + Python** 架构中，作为 `engine/agent/` 目录下的核心逻辑。