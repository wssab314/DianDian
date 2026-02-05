import { useEffect, useState, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { Terminal, Rocket, Bot, User, BrainCircuit, Square, History, LayoutGrid, Book, Save, Settings } from 'lucide-react'
import HistoryView from './components/HistoryView'
import LibraryView from './components/LibraryView'
import DeviceSelector, { DEVICE_PRESETS } from './components/DeviceSelector'
import SettingsModal from './components/SettingsModal'
import TitleBar from './components/TitleBar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Types
interface AgentThought {
    step: 'planning' | 'executing' | 'action'
    detail: string
    strategy?: 'text' | 'vision'
}

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    thoughts?: AgentThought[]
    isThinking?: boolean
    check_thoughts?: boolean
}

// Components

const StatusBadge = ({ connected, hideLabel }: { connected: boolean, hideLabel?: boolean }) => (
    <div className={`rounded-full text-xs font-mono flex items-center gap-2 border transition-all ${hideLabel ? 'p-1.5' : 'px-3 py-1'} ${connected
        ? "bg-green-500/10 border-green-500/20 text-green-400"
        : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        {!hideLabel && (connected ? "神经引擎已就绪" : "引擎断开连接")}
    </div>
)

const MessageItem = ({ msg }: { msg: Message }) => {
    const isUser = msg.role === 'user'

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 max-w-full animate-in fade-in slide-in-from-bottom-2`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500/20 text-indigo-400' : 'bg-primary/20 text-primary'
                }`}>
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                {msg.content && (
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${isUser
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-card border border-white/10 text-slate-200 rounded-tl-sm'
                        }`}>
                        {msg.content}
                    </div>
                )}

                {/* Agent Thoughts (Chain of Thought) */}
                {msg.check_thoughts && msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="flex flex-col gap-1 w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-mono text-muted-foreground mt-1">
                        <div className="flex items-center gap-2 text-primary/70 mb-1">
                            <BrainCircuit className="w-3 h-3" />
                            <span className="uppercase tracking-widest text-[10px] font-bold">思考过程 (Reasoning)</span>
                        </div>
                        {msg.thoughts.map((thought, idx) => (
                            <div key={idx} className="flex gap-2 items-center opacity-80 pl-2 border-l border-white/10">
                                <span className={`shrink-0 uppercase text-[9px] px-1 rounded ${thought.step === 'planning' ? 'bg-blue-500/20 text-blue-400' :
                                    thought.step === 'action' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {thought.step}
                                </span>
                                <span className="flex-1 truncate">{thought.detail}</span>
                                {thought.strategy && (
                                    <span
                                        className={`ml-2 text-[10px] px-1 rounded border ${thought.strategy === 'text'
                                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                            }`}
                                        title={thought.strategy === 'text' ? 'L1: Text Analysis' : 'L2: Vision Analysis'}
                                    >
                                        {thought.strategy === 'text' ? '⚡️ DOM' : '👁️ Vision'}
                                    </span>
                                )}
                            </div>
                        ))}
                        {msg.isThinking && (
                            <div className="flex items-center gap-2 pl-2 mt-1 animate-pulse text-primary/50">
                                <span className="w-1 h-1 bg-current rounded-full" />
                                <span className="w-1 h-1 bg-current rounded-full" />
                                <span className="w-1 h-1 bg-current rounded-full" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function App() {
    console.log("App Rendering...");
    const [, setStatus] = useState('初始化中...')
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [snapshot, setSnapshot] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [currentView, setCurrentView] = useState<'agent' | 'history' | 'library'>('agent')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [currentPreset, setCurrentPreset] = useState('desktop')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    useEffect(scrollToBottom, [messages])

    useEffect(() => {
        const newSocket = io('http://localhost:8000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        })
        setSocket(newSocket)

        newSocket.on('connect', () => {
            console.log('Socket Connected')
            setStatus('已连接')
            setConnected(true)
        })

        newSocket.on('connect_error', (err) => {
            setStatus(`错误: ${err.message}`)
            setConnected(false)
        })

        newSocket.on('disconnect', () => {
            setStatus('已断开')
            setConnected(false)
            setIsProcessing(false)
        })

        newSocket.on('config_updated', (data: { preset: string }) => {
            console.log(`Config updated to ${data.preset}`)
            // Optional: Toast notification
        })

        newSocket.on('processing_state', (data: { status: 'running' | 'idle' }) => {
            setIsProcessing(data.status === 'running')
        })

        newSocket.on('response', (payload: { data: string }) => {
            addAgentMessage(payload.data)
        })

        newSocket.on('agent_thought', (thought: AgentThought) => {
            setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last && last.role === 'assistant' && last.isThinking) {
                    return [
                        ...prev.slice(0, -1),
                        {
                            ...last,
                            thoughts: [...(last.thoughts || []), thought],
                        }
                    ]
                } else {
                    return [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: '',
                            thoughts: [thought],
                            isThinking: true,
                            check_thoughts: true
                        }
                    ]
                }
            })
        })

        newSocket.on('browser_snapshot', (data: { image: string }) => {
            setSnapshot(`data:image/jpeg;base64,${data.image}`)
        })

        newSocket.on('report_generated', () => {
            // Optional: Show toast notification
            console.log("Report generated!")
        })

        // Listen for save case success
        newSocket.on('save_case_success', (data: { name: string }) => {
            alert(`用例 "${data.name}" 保存成功!`)
        })

        return () => {
            newSocket.disconnect()
        }
    }, [])

    const addAgentMessage = (text: string) => {
        setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'assistant' && last.isThinking) {
                return [
                    ...prev.slice(0, -1),
                    {
                        ...last,
                        content: text,
                        isThinking: false
                    }
                ]
            } else {
                return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: text }]
            }
        })
    }

    const handleStop = () => {
        if (!socket) return
        socket.emit('stop', {})
        addAgentMessage("🛑 正在停止...")
    }

    const handleSend = () => {
        if (!socket || !connected || !query.trim()) return

        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query, check_thoughts: false }
        const agentPlaceholder: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            thoughts: [],
            isThinking: true,
            check_thoughts: true
        }

        setMessages(prev => [...prev, userMsg, agentPlaceholder])
        socket.emit('message', { data: query })
        setQuery('')
    }

    const handleAction = () => {
        if (isProcessing) {
            handleStop()
        } else {
            handleSend()
        }
    }

    const handlePresetChange = (preset: string) => {
        if (!socket) return
        setCurrentPreset(preset)
        socket.emit('update_config', { preset })
    }

    // Save Case Logic
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [saveName, setSaveName] = useState('')
    const [saveDescription, setSaveDescription] = useState('')

    const openSaveModal = () => {
        // Filter user prompts to check if there's anything to save
        const prompts = messages.filter(m => m.role === 'user')
        if (prompts.length === 0) {
            alert("没有可保存的操作!")
            return
        }
        setIsSaveModalOpen(true)
    }

    const confirmSaveCase = () => {
        if (!socket || !saveName.trim()) return

        const prompts = messages
            .filter(m => m.role === 'user')
            .map(m => m.content)

        socket.emit('save_case', {
            name: saveName,
            description: saveDescription,
            prompts
        })

        setIsSaveModalOpen(false)
        setSaveName('')
        setSaveDescription('')
    }

    // Get aspect ratio for current preset
    const activePreset = DEVICE_PRESETS.find(p => p.id === currentPreset) || DEVICE_PRESETS[0]
    const aspectRatio = activePreset.width / activePreset.height

    return (
        <div className="h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 overflow-hidden">
            <TitleBar />

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <aside
                    className={`${collapsed ? 'w-16' : 'w-64'} border-r border-white/5 bg-background/50 backdrop-blur-md flex flex-col items-center py-6 gap-6 transition-all duration-300 relative group/sidebar`}
                >
                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="absolute -right-3 top-12 w-6 h-6 bg-card border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all opacity-0 group-hover/sidebar:opacity-100 z-50 shadow-xl"
                    >
                        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                    </button>

                    {/* Empty space or small spacer if needed */}
                    <div className="h-4" />

                    <nav className="flex flex-col gap-2 w-full px-2">
                        <button
                            onClick={() => setCurrentView('agent')}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all ${currentView === 'agent' ? 'bg-white/10 text-white shadow-inner shadow-white/5' : 'text-muted-foreground hover:bg-white/5'}`}
                            title="执行"
                        >
                            <LayoutGrid className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="text-sm font-medium">任务执行</span>}
                        </button>
                        <button
                            onClick={() => setCurrentView('library')}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all ${currentView === 'library' ? 'bg-white/10 text-white shadow-inner shadow-white/5' : 'text-muted-foreground hover:bg-white/5'}`}
                            title="用例库"
                        >
                            <Book className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="text-sm font-medium">用例库</span>}
                        </button>
                        <button
                            onClick={() => setCurrentView('history')}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all ${currentView === 'history' ? 'bg-white/10 text-white shadow-inner shadow-white/5' : 'text-muted-foreground hover:bg-white/5'}`}
                            title="历史"
                        >
                            <History className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="text-sm font-medium">运行报告</span>}
                        </button>
                    </nav>

                    <div className="mt-auto w-full px-2 flex flex-col gap-2">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all text-muted-foreground hover:bg-white/5 hover:text-white`}
                            title="设置"
                        >
                            <Settings className="w-5 h-5 shrink-0" />
                            {!collapsed && <span className="text-sm font-medium">配置设置</span>}
                        </button>

                        <div className={`transition-all duration-300 ${collapsed ? 'scale-75' : 'scale-100'}`}>
                            <StatusBadge connected={connected} hideLabel={collapsed} />
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {currentView === 'agent' ? (
                        <main className="flex-1 flex overflow-hidden">
                            {/* Chat Area */}
                            <div className={`flex-1 flex flex-col relative z-10 w-full transition-all duration-500`}>

                                {/* Messages List */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                            <Bot className="w-16 h-16" />
                                            <p>准备就绪，请下达指令</p>
                                        </div>
                                    ) : (
                                        messages.map(msg => <MessageItem key={msg.id} msg={msg} />)
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-white/5">
                                    <div className="relative group max-w-3xl mx-auto flex items-center gap-3">

                                        {/* Save Button (Left of Input) */}
                                        {messages.length > 0 && (
                                            <button
                                                onClick={openSaveModal}
                                                className="p-3 rounded-2xl bg-card border border-white/10 text-muted-foreground hover:text-white hover:border-primary/50 transition-all shadow-md group/save relative overflow-hidden"
                                                title="保存为用例"
                                            >
                                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/save:opacity-100 transition-opacity" />
                                                <Save className="w-5 h-5 relative z-10" />
                                            </button>
                                        )}

                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500 left-12 right-0"></div>
                                        <div className="relative flex-1 bg-card border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                                            <div className="pl-4 pr-3 text-muted-foreground">
                                                <Terminal className="w-6 h-6" />
                                            </div>
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50 h-10 text-white disabled:opacity-50"
                                                placeholder={connected ? (isProcessing ? "Agent 正在执行..." : "例如：去百度搜索 Python 教程") : "正在连接引擎..."}
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSend()}
                                                disabled={!connected || isProcessing}
                                            />
                                            <button
                                                className={`px-3 py-2 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2 ${connected
                                                    ? (isProcessing ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25" : "bg-primary hover:bg-primary/90 text-white shadow-primary/25")
                                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                                    }`}
                                                onClick={handleAction}
                                                disabled={!connected}
                                            >
                                                {isProcessing ? <Square className="w-4 h-4 fill-current" /> : <Rocket className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            {snapshot ? (
                                <div className="w-[45%] border-l border-white/5 bg-black/50 backdrop-blur-sm p-4 flex flex-col gap-2 animate-in slide-in-from-right-10 fade-in duration-500">
                                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2 justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            实时预览 (点击画面以教学)
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DeviceSelector
                                                currentPreset={currentPreset}
                                                onSelect={handlePresetChange}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>

                                    {/* Centered Container for Aspect Ratio */}
                                    <div className="flex-1 flex items-center justify-center p-4 bg-black/20 rounded-xl overflow-hidden border border-white/5 relative">
                                        <div
                                            className="relative shadow-2xl bg-black cursor-crosshair group transition-all duration-300"
                                            style={{
                                                aspectRatio: `${aspectRatio}`,
                                                maxHeight: '100%',
                                                maxWidth: '100%'
                                            }}
                                            onClick={(e) => {
                                                if (!socket) return
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                const x = (e.clientX - rect.left) / rect.width
                                                const y = (e.clientY - rect.top) / rect.height

                                                // Visual feedback
                                                const ripple = document.createElement('div')
                                                ripple.className = 'absolute w-4 h-4 bg-primary/50 rounded-full animate-ping pointer-events-none'
                                                ripple.style.left = `${e.clientX - rect.left - 8}px`
                                                ripple.style.top = `${e.clientY - rect.top - 8}px`
                                                e.currentTarget.appendChild(ripple)
                                                setTimeout(() => ripple.remove(), 1000)

                                                console.log(`Pointing at: ${x.toFixed(2)}, ${y.toFixed(2)}`)
                                                socket.emit('interact', { x, y })
                                            }}
                                        >
                                            <img src={snapshot} className="w-full h-full object-contain pointer-events-none" alt="Live Browser View" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                null
                            )}
                        </main>
                    ) : currentView === 'library' ? (
                        <LibraryView socket={socket} connected={connected} />
                    ) : (
                        <HistoryView />
                    )}

                    {/* Save Case Modal */}
                    {isSaveModalOpen && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-card w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-white/5">
                                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                                        <Save className="w-5 h-5 text-primary" />
                                        保存测试用例
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">将当前对话流程保存为可复用的测试脚本。</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">用例名称</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
                                            placeholder="例如：验证登录流程"
                                            value={saveName}
                                            onChange={e => setSaveName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">描述 (可选)</label>
                                        <textarea
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 min-h-[80px]"
                                            placeholder="描述这个测试的功能..."
                                            value={saveDescription}
                                            onChange={e => setSaveDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-muted/20 flex gap-3 justify-end border-t border-white/5">
                                    <button
                                        onClick={() => setIsSaveModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 transition-all"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmSaveCase}
                                        disabled={!saveName.trim()}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modals */}
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        socket={socket}
                    />
                </div>
            </div>
        </div>
    )
}

export default App
