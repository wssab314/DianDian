import React, { useEffect, useState } from 'react'
// import io from 'socket.io-client' // 暂时先注释，等 npm install 后再启用

function App() {
    const [status, setStatus] = useState('初始化中...')

    useEffect(() => {
        // const socket = io('http://localhost:8000')
        // socket.on('connect', () => {
        //   setStatus('已连接 Python 引擎 🟢')
        // })
        // socket.on('disconnect', () => {
        //   setStatus('Python 引擎断开 🔴')
        // })
        // return () => {
        //   socket.disconnect()
        // }
        setStatus('等待依赖安装... (Socket.IO client not installed yet)')
    }, [])

    return (
        <div className="flex h-screen bg-neutral-900 text-white font-sans">
            <div className="m-auto text-center space-y-4">
                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    DianDian 点点
                </h1>
                <p className="text-xl text-gray-400">像聊天一样完成软件测试</p>

                <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800/50 backdrop-blur">
                    <p>系统状态: <span className="font-mono text-yellow-400">{status}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-8">
                    <div className="p-4 bg-neutral-800 rounded">
                        <h3 className="font-bold mb-2">Electron</h3>
                        <p className="text-sm text-gray-400">GUI 容器就绪</p>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded">
                        <h3 className="font-bold mb-2">Python Engine</h3>
                        <p className="text-sm text-gray-400">等待集成</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
