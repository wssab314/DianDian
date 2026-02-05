这份 **DianDian (点点) v1.1 产品需求文档 (PRD)** 是基于 v1.0 MVP 的验证基础，结合了我们之前确认的 **Qwen 模型能力** 和 **Playwright Agent (Aria Snapshot)** 技术特性的迭代版本。

v1.1 的核心主题是：**从“玩具”走向“工具”——提升稳定性和可复用性。**

---

# DianDian (点点) 产品需求文档 - v1.1 迭代版

| 项目         | 内容                                                 |
| :----------- | :--------------------------------------------------- |
| **产品名称** | DianDian (点点)                                      |
| **版本号**   | v1.1 (Stability & Replay)                            |
| **状态**     | 待开发                                               |
| **核心目标** | 引入混合感知引擎降本增效；实现测试用例的保存与回放。 |
| **目标用户** | 手工测试人员 (Manual QA)、初级自动化工程师           |

---

## 1. 迭代背景与目标

### 1.1 背景 (Context)
v1.0 版本验证了“自然语言驱动浏览器”的可行性，但在实际高频使用中存在两大痛点：
1.  **成本与速度：** 纯视觉方案 (Screenshot + VL Model) 响应慢（单步~5秒+），且 Token 消耗大。
2.  **一次性使用：** 用户跑完一次测试后，无法保存流程，下次回归测试还得重新输入指令。

### 1.2 目标 (Goals)
1.  **技术升级：** 引入 Playwright `ariaSnapshot`，构建 **Text-First, Vision-Fallback (文本优先，视觉兜底)** 的混合感知架构，将平均单步耗时降低至 2秒以内，成本降低 70%。（参考文档：https://playwright.dev/docs/test-agents）
2.  **业务闭环：** 增加 **“用例库”** 模块，支持将自然语言对话保存为固定的测试用例，并支持一键回放。
3.  **体验优化：** 增强“人机协同”，允许用户在 AI 迷路时通过鼠标点选纠正，并让 AI 记住。

---

## 2. 新增功能特性 (Feature List)

| ID       | 模块         | 功能名称                             | 优先级 | 描述                                                         |
| :------- | :----------- | :----------------------------------- | :----- | :----------------------------------------------------------- |
| **F-01** | **核心引擎** | **混合感知模式 (Hybrid Perception)** | **P0** | 优先使用 Aria Snapshot + Qwen-Max；失败时自动切换截图 + Qwen-VL。 |
| **F-02** | **用例管理** | **保存为用例 (Save as Case)**        | **P0** | 将当前的对话历史保存为可执行脚本。                           |
| **F-03** | **用例管理** | **用例库与回放 (Library & Replay)**  | **P0** | 列表展示已保存用例，支持一键重新执行。                       |
| **F-04** | **人机协同** | **指点纠正 (Point & Teach)**         | **P1** | AI 找不到元素时，用户点击屏幕元素，AI 自动获取 Locator 并继续。 |
| **F-05** | **环境配置** | **移动端模拟 (Mobile Emulation)**    | **P2** | 支持模拟 iPhone/Android 视口进行测试。                       |
| **F-06** | **环境配置** | **多环境切换 (Env Vars)**            | **P2** | 支持定义 Base URL (Dev/Test/Prod)，用例中用 `{{BASE_URL}}` 替代硬编码。 |

---

## 3. 详细功能需求说明

### 3.1 核心引擎升级：混合感知模式 (Hybrid Agent)

*   **逻辑描述：**
    为了解决 Qwen-VL 贵且慢的问题，Agent 执行逻辑变更为双层状态机。
*   **执行流程：**
    1.  **L1 (快思考):** Python 调用 `page.aria_snapshot()` 获取页面语义树。
    2.  **L1 决策:** 发送 Text Prompt 给 **Qwen-Max**。
        *   *Prompt:* "基于以下页面结构，我要点击'登录'，请返回 Locator。"
    3.  **L1 执行:** 若 Qwen-Max 返回明确 Locator (如 `get_by_role('button', name='登录')`)，直接执行。
    4.  **L2 (慢思考 - 兜底):** 若 Qwen-Max 回复 "看不懂/找不到"，或者 L1 执行报错（元素不可见）：
        *   触发 **截图 + SoM 标记**。
        *   发送 Image 给 **Qwen-VL-Max**。
        *   执行视觉点击。
*   **用户感知：** 界面上的 "AI 思考中..." 状态会明显变快，只有遇到复杂 Canvas 或图标时才会变慢。

### 3.2 用例库 (Test Case Library)

*   **入口：** 左侧导航栏新增“我的用例”图标。
*   **保存流程：**
    1.  用户在对话框完成了一次成功的测试（如“购买流程”）。
    2.  点击右上角“保存为用例”按钮。
    3.  弹窗输入：用例名称（如“访客下单流程”）、描述、标签。
    4.  系统将当前的 Prompt 链条（User Prompts）序列化存储到 SQLite。
*   **回放流程：**
    1.  在“我的用例”列表中点击“运行”。
    2.  系统清空当前 Context，自动按顺序将历史 Prompt 发送给 Agent。
    3.  *优化点:* 回放时默认跳过“思考过程”展示，只展示“执行结果”，提高回放速度。

### 3.3 人机协同：指点纠正 (Point & Teach)

*   **场景：** AI 卡住了，说“我找不到‘提交’按钮”。
*   **交互：**
    1.  AI 发送求助消息，并在右侧浏览器上方显示浮层：“请帮我指出元素”。
    2.  用户鼠标移动到右侧浏览器视图，元素会有 hover 高亮（Playwright Inspector 机制）。
    3.  用户点击目标按钮。
    4.  **系统行为：**
        *   Python 捕获用户点击的元素 Selector。
        *   立即执行点击操作。
        *   **关键：** 将这个 Selector 写入短期记忆："下次找'提交'按钮时，直接使用 `.submit-btn-v2`"。

### 3.4 移动端模拟 (Mobile Emulation)

*   **需求：** 很多 H5 页面需要在手机模式下测试。
*   **设置入口：** 新建任务时，或者全局设置中。
*   **选项：**
    *   Desktop (默认)
    *   iPhone 13 / 14 Pro
    *   iPad Pro
*   **技术实现：** 初始化 Playwright Context 时传入 `viewport` 和 `userAgent` 参数。

---

## 4. 界面交互设计 (UI/UX) 更新

### 4.1 布局调整
*   **左侧导航栏 (Sidebar):**
    *   新增 Tab: 💬 对话 (Chat), 📂 用例库 (Library), ⚙️ 设置 (Settings).
*   **对话气泡 (Chat Bubble):**
    *   区分 **L1 (文本)** 和 **L2 (视觉)** 的图标状态。
    *   如果是 L1 执行，显示 ⚡ (闪电图标)；如果是 L2 执行，显示 👁️ (眼睛图标)。让用户感知到 AI 到底是用读的还是用看的。

### 4.2 用例库视图
*   卡片式布局，每个卡片显示：用例名、最后运行时间、最近一次状态（通过/失败 🟢/🔴）。
*   操作按钮：▶️ 运行、✏️ 编辑（修改 Prompt）、🗑️ 删除。

---

## 5. 数据存储结构 (Database Schema)

需要更新 SQLite 数据库结构以支持 v1.1。

**Table: test_cases**
```sql
CREATE TABLE test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    steps JSON NOT NULL, -- 存储 prompt 列表: ["打开京东", "搜索手机", "点击第一个"]
    device_config JSON,  -- {"mobile": true, "model": "iPhone 13"}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Table: test_runs** (执行记录)
```sql
CREATE TABLE test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER, -- 关联 test_cases，如果是临时对话则为 NULL
    status TEXT,     -- 'PASS', 'FAIL'
    duration INTEGER, -- 秒
    log_path TEXT,    -- 本地 HTML 报告路径
    video_path TEXT   -- 视频路径
);
```

---

## 6. 非功能需求 (NFR)

1.  **性能指标：**
    *   简单操作（如点击文本按钮）响应时间 < 2秒（依托 Aria Snapshot）。
    *   复杂操作（如视觉识别）响应时间 < 8秒。
2.  **稳定性：**
    *   连续回放 50 个步骤不崩溃。
    *   Electron 渲染进程 CPU 占用率 < 30%。
3.  **兼容性：**
    *   必须支持 macOS (Arm64/x64) 和 Windows 10/11。

---

## 7. 实施路线图 (Roadmap for v1.1)

*   **Stage 1:**
    *   后端：重构 Executor，实现 L1/L2 混合感知逻辑。
    *   后端：集成 Qwen-Max (Text) 和 Qwen-VL (Vision) 的双模型调用。
*   **Stage 2:**
    *   前端：开发“用例库”界面。
    *   后端：实现 SQLite 存储和读取用例逻辑。
    *   后端：实现 Prompt 序列化与反序列化（回放功能）。
*   **Stage 3:**
    *   前端 & 后端：联调“指点纠正”功能（最难点，需要前端透传坐标，后端反查 DOM）。
    *   设置页：添加移动端模拟配置。
*   **Stage 4:**
    *   全量测试与 Bug Fix。
    *   发布 v1.1 安装包。
