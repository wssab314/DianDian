# DianDian (点点) 🤖

> **Turning Toys into Tools.**
> A natural language driven, hybrid-perception web automation agent.

**Current Version:** v1.1 (In Development)
**Status:** 🚧 Iterating

## 🌟 What is DianDian?

DianDian is an intelligent browser agent that "sees" web pages like a human and "reads" code like a machine. It converts your natural language instructions (e.g., "Go to Amazon and buy a black keyboard") into actual browser actions.

In **v1.1**, we are introducing a **Hybrid Perception Engine** that combines the speed of DOM-based text analysis (L1) with the robustness of visual understanding (L2), significantly reducing cost and latency while enabling **Test Case Recording & Replay**.

## ✨ Key Features (v1.1)

- **🧠 Hybrid Perception Engine**:
  - **L1 (Fast-Path)**: Uses `Aria Snapshot` + `Qwen-Max` for sub-2s response time on standard UI.
  - **L2 (Robust-Path)**: Fallback to `Screenshot` + `SoM` + `Qwen-VL-Max` for complex visual tasks.
- **📼 Record & Replay**: Save your conversation as a reusable Test Case. Build your regression suite simply by chatting.
- **👆 Point & Teach**: AI stuck? Just click the element on the screen to teach it correct selector.
- **📱 Mobile Emulation**: Test H5 pages by simulating iPhone/Android viewports.
- **📊 Local Reporting**: Auto-generated HTML reports with screenshots and step-by-step logs.

## 🛠️ Tech Stack

- **Frontend**: Electron + React + TailwindCSS + Radix UI
- **Backend**: Python (FastAPI + Socket.IO)
- **AI Core**: Qwen-Max (Logic/Text) + Qwen-VL-Max (Vision)
- **Automation**: Playwright (w/ Aria Snapshot)
- **Database**: SQLite + SQLModel

## 🚀 Getting Started

### Prerequisites
- Node.js > 18
- Python > 3.10
- DashScope API Key (Qwen Models)

### Installation

```bash
# 1. Clone Repo
git clone https://github.com/your-repo/diandian.git

# 2. Frontend Setup
npm install

# 3. Backend Setup
cd engine
pip install -r requirements.txt
```

### Running

```bash
# Terminal 1: Start Backend & Frontend
npm run dev
```

## 🗺️ Roadmap

- [x] **v1.0 MVP**: Visual-only Agent, Basic Chat, Browser Control.
- [ ] **v1.1 Stability**: Hybrid Engine, SQLite Persistence, Case Library.
- [ ] **v1.2 Scale**: Cloud Execution, CI/CD Integration, Docker Support.

---
*Built with ❤️ by Aibu*
