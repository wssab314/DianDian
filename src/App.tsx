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

    useEffect(() => {
        const newSocket = io('http://localhost:8000')
        setSocket(newSocket)

        newSocket.on('connect', () => {
            setStatus('Connected to Python Engine')
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            setStatus('Engine Disconnected')
            setConnected(false)
        })

        return () => {
            newSocket.disconnect()
        }
    }, [])

    const handleTest = () => {
        if (socket) {
            socket.emit('message', { data: 'Ping from UI' })
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

            {/* Main Content - Launchpad Mode */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Ambient Background Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

                <div className="w-full max-w-2xl space-y-8 relative z-10">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="text-white">Chat to </span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Test</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">您的 AI 结对测试搭档，随时待命。</p>
                    </div>

                    {/* Main Input Box */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                        <div className="relative bg-card border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                            <div className="pl-4 pr-3 text-muted-foreground">
                                <Terminal className="w-6 h-6" />
                            </div>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 h-12 text-white"
                                placeholder="描述测试目标，例如：测试登录页面..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button
                                className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
                                onClick={handleTest}
                            >
                                <Rocket className="w-4 h-4" />
                                <span>Start</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions / Recommendations */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
                        {['验证登录失败', '购买红色T恤', '遍历所有菜单', '检查移动端适配'].map((item) => (
                            <button key={item} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-sm text-muted-foreground hover:text-white text-left">
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Logs Area (Placeholder for now) */}
                <div className="absolute bottom-6 left-6 right-6 h-32 rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm p-4 font-mono text-xs text-muted-foreground overflow-y-auto hidden md:block">
                    <div className="flex items-center gap-2 mb-2 text-white/50 border-b border-white/5 pb-1">
                        <Activity className="w-3 h-3" />
                        <span>SYSTEM LOGS</span>
                    </div>
                    <div className="space-y-1">
                        <p>[09:41:22] Python Engine initialized on port 8000</p>
                        <p>[09:41:23] Socket.IO connection established</p>
                        {connected && <p className="text-green-500/80">[System] Ready to accept commands.</p>}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
