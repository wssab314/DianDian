# DianDian (点点) 🤖

<div align="center">

![DianDian Banner](https://img.shields.io/badge/DianDian-v1.1%20Stable-blueviolet?style=for-the-badge&logo=robot-framework)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/Frontend-React%20Electron-61DAFB?style=for-the-badge&logo=react)

**Turning Toys into Tools.**
<br>
**让玩具变成生产力工具。**

[功能特性](#-功能特性) • [安装指南](#-安装指南) • [使用方法](#-使用方法) • [架构设计](#-技术架构) • [常见问题](#-faq)

</div>

---

## 📖 项目简介 (Introduction)

**DianDian (点点)** 是一个下一代智能网页自动化代理。它不仅仅是一个能“看”网页的 AI，更是一个能帮你**构建自动化测试、完成重复性工作**的生产力工具。

与传统的自动化脚本不同，你无需编写一行代码，只需用**自然语言**告诉它："帮我测试一下淘宝的登录流程"，或者 "去 Google 搜索最新的 Python 教程"。

在 **v1.1** 版本中，我们要解决核心痛点：**成本、速度与可复用性**。引入了革命性的 **混合感知引擎 (Hybrid Perception Engine)**，并支持将对话直接保存为可重复执行的测试用例。

---

## ✨ 核心特性 (Key Features)

### 🧠 混合感知引擎 (Hybrid Perception)
告别缓慢且昂贵的纯视觉方案。DianDian v1.1 采用双层状态机：
- **⚡️ L1 极速文本模式 (Text-First)**: 优先使用 `Aria Snapshot` 获取网页语义结构，配合 `Qwen-Max` 实现秒级推理与操作。速度提升 300%，成本降低 70%。
- **👁️ L2 视觉兜底模式 (Vision-Fallback)**: 当遇到复杂 Canvas 或 L1 无法定位时，自动无缝切换到 `Screenshot` + `SoM` (Set-of-Mark) + `Qwen-VL-Max` 模式，确保操作的高可用性。

### 📼 用例库与回放 (Library & Replay)
不要让你的指令成为一次性的消耗品。
- **保存为用例**: 这里没跑通？没关系，跑通后一键点击 "保存"，将当前的 Prompt 链条存入数据库。
- **一键回放**: 在 "用例库" 中一键复现，自动执行回归测试。

### 👆 指点纠正 (Point & Teach)
AI 也有迷路的时候。当它说 "我找不到提交按钮" 时：
- **实时介入**: 你可以直接在右侧的实时预览窗口中点击那个按钮。
- **智能学习**: 系统会自动反查 DOM 结构，生成最优 CSS 选择器，并注入 AI 的短期记忆中，教它 "下次就点这里"。

### 📱 全能环境模拟 (Mobile & Multi-Env)
- **多设备模拟**: 支持一键切换 iPhone 14 Pro, Pixel 7, iPad Pro 或桌面视口，轻松测试移动端 H5 页面。
- **多环境切换**: 支持在 `.env` 中定义 `BASE_URL`，并在运行时动态切换 (例如从 Staging 切到 Production)，无需重启应用。

---

## 🛠️ 技术架构 (Architecture)

DianDian采用现代化的前后端分离架构，确保高性能与扩展性。

| 模块 | 技术栈 | 说明 |
| :--- | :--- | :--- |
| **Frontend** | **Electron + React + TailwindCSS** | 提供流畅的桌面应用体验，集成实时浏览器预览流。 |
| **Backend** | **Python (FastAPI + Socket.IO)** | 处理核心业务逻辑，管理浏览器实例与 AI 对话。 |
| **Brain** | **Qwen-Max + Qwen-VL-Max** | 阿里云通义千问模型，分别负责逻辑推理与视觉理解。 |
| **Automation** | **Playwright** | 业界最强浏览器自动化框架，支持 `Aria Snapshot`。 |
| **Database** | **SQLite + SQLModel** | 本地数据持久化，存储测试用例与历史记录。 |

---

## 🚀 安装指南 (Quick Start)

### 前置要求
*   **Node.js**: >= 18.0.0
*   **Python**: >= 3.10
*   **DashScope API Key**: 需要开通阿里云 DashScope 服务并获取 API Key。

### 1. 克隆项目
```bash
git clone https://github.com/wssab314/DianDian.git
cd DianDian
```

### 2. 前端依赖
```bash
npm install
```

### 3. 后端环境
建议使用 Conda 或 venv 创建虚拟环境。

```bash
# 进入后端目录
cd engine

# 创建并激活虚拟环境 (可选)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
playwright install chromium
```

### 4. 配置环境变量
在 `engine` 目录下创建 `.env` 文件：

```ini
# engine/.env
DASHSCOPE_API_KEY=sk-your-api-key-here
BASE_URL=https://www.google.com
ENV_NAME=Production
```

### 5. 启动应用
回到项目根目录，一条命令启动所有服务：

```bash
npm run dev
```
*这将同时启动 Python 后端 (Port 8000) 和 React 前端渲染进程。*

---

## 💡 使用指南 (Usage)

1.  **开始对话**: 在输入框输入指令，例如 "打开百度搜索 Python"。
2.  **观察执行**: 右侧窗口会实时显示浏览器画面。左侧对话流会显示 AI 的思考过程（⚡️ 代表文本模式，👁️ 代表视觉模式）。
3.  **干预纠正**: 如果 AI 停住，点击右侧预览图中的元素即可辅助点击。
4.  **保存用例**: 任务完成后，点击右上角的 "保存" 图标，将其存为测试用例。
5.  **查看历史**: 点击左侧边栏的 "用例库" 图标，查看并回放之前的用例。

---

---

## 🤖 Agent 核心实现 (Deep Dive)

DianDian 的 Agent 并非简单的 OpenAI 套壳，而是基于 Playwright 最新底层能力构建的增强方案：

-   **官方底层深度集成**: 我们深度利用了 Playwright 官方推出的 **Aria Snapshot (辅助功能树快照)** 技术。Agent 不会去解析混乱的 HTML 源码，而是直接理解经过渲染后的语义树（包括角色、名称、状态），极大提升了指令理解的准确率。
-   **Qwen 驱动的推理引擎**: 针对国内环境優化，我们将 Aria Snapshot 喂给 **通义千问 (Qwen-Max)**，通过自研的 Prompt 策略实现比官方预览版更稳定的中文指令解析。
-   **混合感知架构 (Hybrid Perception)**: 
    -   **L1 (Text-First)**: 优先通过文本语义进行极速交互，降低延迟与 Token 成本。
    -   **L2 (Vision-Fallback)**: 当文本无法描述对应元素（如 Canvas 或 无标签图标）时，自动触发视觉识别，利用 **SoM (Set-of-Mark)** 标记技术配合 Qwen-VL 实现精准定位。
-   **全平台 Sidecar 架构**: 后端 Python 引擎被打包为 **Sidecar 二进制文件**，可随 Electron 应用直接分发，用户无需配置 Python 环境即可获得原生 Agent 执行能力。

---

## 🗺️ 路线图 (Roadmap)

- [x] **v1.0 MVP**: 纯视觉代理，基础对话功能。
- [x] **v1.1 Stability (Current)**: 混合感知引擎，SQLite 持久化，移动端模拟，指点纠正。
- [x] **v1.2 Packaging & CI/CD**: 
    - [x] 全平台桌面化打包方案 (.exe / .dmg)。
    - [x] 集成 GitHub Actions 自动化发布流水线。
- [ ] **v1.3 Scalability**: 
    - [ ] 支持 Docker 容器化部署。
    - [ ] 支持更多主流 LLM 模型 (DeepSeek, Claude)。
    - [ ] 导出 Playwright Pytest/Vitest 脚本。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！让我们一起把 DianDian 变得更强。

## 📄 许可证 (License)

MIT License.

---
<div align="center">
<i>Built with ❤️ by Aibu & The Open Source Community</i>
</div>
