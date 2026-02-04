"use strict";
const electron = require("electron");
const path = require("node:path");
const node_child_process = require("node:child_process");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const PYTHON_SCRIPT_PATH = path.join(__dirname, "../engine/server.py");
let pythonProcess = null;
function startPythonEngine() {
  console.log("Starting Python Engine from:", PYTHON_SCRIPT_PATH);
  const pythonExecutable = process.platform === "win32" ? "python" : "python3";
  pythonProcess = node_child_process.spawn(pythonExecutable, [PYTHON_SCRIPT_PATH], {
    cwd: path.dirname(PYTHON_SCRIPT_PATH),
    stdio: ["ignore", "pipe", "pipe"]
    // Listen to stdout/stderr
  });
  if (pythonProcess.stdout) {
    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Python Engine]: ${data.toString()}`);
    });
  }
  if (pythonProcess.stderr) {
    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Python Engine Error]: ${data.toString()}`);
    });
  }
  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
  });
}
function stopPythonEngine() {
  if (pythonProcess) {
    console.log("Stopping Python Engine...");
    pythonProcess.kill();
    pythonProcess = null;
  }
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false
      // 简化 MVP 通信，生产环境建议开启
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  stopPythonEngine();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(() => {
  startPythonEngine();
  createWindow();
});
electron.app.on("will-quit", () => {
  stopPythonEngine();
});
