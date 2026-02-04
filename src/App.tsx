import React, { useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'
import { Sparkles, Terminal, Rocket, Activity } from 'lucide-react'

// 简单的组件定义，后续可拆分
const StatusBadge = ({ connected }: { connected: boolean }) => (
    <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border ${connected
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        {connected ? "NEURAL ENGINE ACTIVE" : "ENGINE DISCONNECTED"}
    </div>
)

function App() {
    const [status, setStatus] = useState('Initializing...')
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [query, setQuery] = useState('')
    const [snapshot, setSnapshot] = useState<string | null>(null)

    useEffect(() => {
        // 强制使用 websocket 或 polling, 并启用重连
        const newSocket = io('http://localhost:8000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        })
        setSocket(newSocket)

        newSocket.on('connect', () => {
            console.log('Socket Connected:', newSocket.id)
            setStatus('Connected to Python Engine')
            setConnected(true)
        })

        newSocket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err)
            setStatus(`Connection Failed: ${err.message}`)
            setConnected(false)
        })

        newSocket.on('disconnect', () => {
            console.log('Socket Disconnected')
            setStatus('Engine Disconnected')
            setConnected(false)
        })

        newSocket.on('browser_snapshot', (data: { image: string }) => {
            console.log('Received browser snapshot')
            setSnapshot(`data:image/jpeg;base64,${data.image}`)
        })

        // 测试连接
        newSocket.emit('message', { data: 'Ping (Init)' })

        return () => {
            newSocket.disconnect()
        }
    }, [])

    const handleTest = () => {
        if (!socket || !connected) {
            setStatus('Error: Engine not connected')
            console.warn('Cannot send command: Engine not connected')
            return
        }

        if (query) {
            console.log('Sending command:', query)
            // Simple heuristic: if input looks like a URL, navigate. Otherwise treat as chat (future)
            if (query.includes('.') && !query.includes(' ')) {
                setStatus(`Navigating to ${query}...`)
                socket.emit('navigate', query)
            } else {
                socket.emit('message', { data: query })
            }
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
            {/* Top Navbar */}
            <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">DianDian</span>
                </div>

                <StatusBadge connected={connected} />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left: Chat / Input Area */}
                <div className={`flex-1 flex flex-col p-6 relative z-10 max-w-2xl mx-auto w-full transition-all duration-500 ${snapshot ? 'translate-x-0' : ''}`}>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
                        <div className="text-center space-y-2 mt-20">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                <span className="text-white">Chat to </span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Test</span>
                            </h1>
                            <p className="text-muted-foreground text-lg">您的 AI 结对测试搭档，随时待命。</p>
                        </div>
                    </div>

                    {/* Input Box */}
                    <div className="relative group mt-auto">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                        <div className="relative bg-card border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                            <div className="pl-4 pr-3 text-muted-foreground">
                                <Terminal className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 h-12 text-white disabled:opacity-50"
                                placeholder={connected ? "输入 URL (如 google.com) 开始测试..." : "等待引擎连接..."}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                                disabled={!connected}
                            />
                            <button
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2 ${connected
                                        ? "bg-primary hover:bg-primary/90 text-white shadow-primary/25"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                    }`}
                                onClick={handleTest}
                                disabled={!connected}
                            >
                                <Rocket className="w-4 h-4" />
                                <span>Start</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
                        {['google.com', 'baidu.com', 'github.com', 'bilibili.com'].map((item) => (
                            <button
                                key={item}
                                onClick={() => setQuery(item)}
                                className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-sm text-muted-foreground hover:text-white text-left"
                                disabled={!connected}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Live Preview (Conditional) */}
                {snapshot && (
                    <div className="w-[50%] border-l border-white/5 bg-black/50 backdrop-blur-sm p-4 flex flex-col gap-2 animate-in slide-in-from-right-10 fade-in duration-500">
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            LIVE PREVIEW
                        </div>
                        <div className="flex-1 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black relative">
                            <img src={snapshot} className="w-full h-full object-contain" alt="Live Browser View" />
                        </div>
                    </div>
                )}
            </main>

            {/* Status Bar */}
            <div className="h-8 border-t border-white/5 bg-black/40 backdrop-blur text-[10px] text-muted-foreground flex items-center px-4 gap-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    <span>STATUS: {status}</span>
                </div>
            </div>
        </div>
    )
}

export default App
