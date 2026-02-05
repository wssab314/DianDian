import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { spawn, ChildProcess } from 'node:child_process'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
// ⚠️ 实际发布时，可能需要指向打包后的 exe；开发模式下直接调用 python 
let pythonProcess: ChildProcess | null = null

function getEnginePath() {
    if (app.isPackaged) {
        // In packaged app, engine is in resources folder
        const exeName = process.platform === 'win32' ? 'diandian-engine.exe' : 'diandian-engine'
        return path.join(process.resourcesPath, 'bin', exeName)
    }
    // In dev, use python directly
    return path.join(__dirname, '../engine/server.py')
}

function startPythonEngine() {
    const enginePath = getEnginePath()
    console.log('Starting Python Engine from:', enginePath)

    if (app.isPackaged) {
        // Run the bundled executable
        pythonProcess = spawn(enginePath, [], {
            cwd: path.dirname(enginePath),
            stdio: ['ignore', 'pipe', 'pipe']
        })
    } else {
        // Dev mode: Run via python interpreter
        // 假设用户环境已有 python3 或者 python
        // 在 Windows 上可能是 'python'，Mac/Linux 可能是 'python3'
        // 简单起见，这里先尝试 'python'，失败则尝试 'python3'
        // 更好的做法是检查环境，或者让用户配置
        const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3'
        pythonProcess = spawn(pythonExecutable, [enginePath], {
            cwd: path.dirname(enginePath),
            stdio: ['ignore', 'pipe', 'pipe']
        })
    }

    if (pythonProcess.stdout) {
        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Python Engine]: ${data.toString()}`)
        })
    }

    if (pythonProcess.stderr) {
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python Engine Error]: ${data.toString()}`)
        })
    }

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`)
        pythonProcess = null
    })
}

function stopPythonEngine() {
    if (pythonProcess) {
        console.log('Stopping Python Engine...')
        pythonProcess.kill()
        pythonProcess = null
    }
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // Changed for security
            contextIsolation: true, // Changed for security
        },
    })

    // Window controls IPC
    ipcMain.on('window-minimize', () => win?.minimize())
    ipcMain.on('window-maximize', () => {
        if (win?.isMaximized()) {
            win.unmaximize()
        } else {
            win?.maximize()
        }
    })
    ipcMain.on('window-close', () => win?.close())

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    const devServerUrl = process.env.VITE_DEV_SERVER_URL
    if (devServerUrl) {
        win.loadURL(devServerUrl)
        win.webContents.openDevTools()
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    stopPythonEngine()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    startPythonEngine()
    createWindow()
})

app.on('will-quit', () => {
    stopPythonEngine()
})
