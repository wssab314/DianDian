import React, { useEffect, useState, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { Sparkles, Terminal, Rocket, Activity, Bot, User, BrainCircuit, Square, History, LayoutGrid } from 'lucide-react'
import HistoryView from './components/HistoryView'

// Types
interface AgentThought {
    step: 'planning' | 'executing' | 'action'
    detail: string
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
const StatusBadge = ({ connected }: { connected: boolean }) => (
    <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 border ${connected
        ? "bg-green-500/10 border-green-500/20 text-green-400"
        : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        {connected ? "NEURAL ENGINE ACTIVE" : "ENGINE DISCONNECTED"}
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
                            <span className="uppercase tracking-widest text-[10px] font-bold">Reasoning Process</span>
                        </div>
                        {msg.thoughts.map((thought, idx) => (
                            <div key={idx} className="flex gap-2 items-start opacity-80 pl-2 border-l border-white/10">
                                <span className={`shrink-0 uppercase text-[9px] px-1 rounded ${thought.step === 'planning' ? 'bg-blue-500/20 text-blue-400' :
                                    thought.step === 'action' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {thought.step}
                                </span>
                                <span>{thought.detail}</span>
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
    const [status, setStatus] = useState('Initializing...')
    const [connected, setConnected] = useState(false)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [snapshot, setSnapshot] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [currentView, setCurrentView] = useState<'agent' | 'history'>('agent')

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
            setStatus('Connected')
            setConnected(true)
        })

        newSocket.on('connect_error', (err) => {
            setStatus(`Error: ${err.message}`)
            setConnected(false)
        })

        newSocket.on('disconnect', () => {
            setStatus('Disconnected')
            setConnected(false)
            setIsProcessing(false)
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
        addAgentMessage("🛑 Stopping...")
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

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30">
            {/* Sidebar Navigation */}
            <aside className="w-20 border-r border-white/5 bg-background/50 backdrop-blur-md flex flex-col items-center py-6 gap-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>

                <nav className="flex flex-col gap-4 w-full px-2">
                    <button
                        onClick={() => setCurrentView('agent')}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${currentView === 'agent' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:bg-white/5'}`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Agent</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('history')}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${currentView === 'history' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:bg-white/5'}`}
                    >
                        <History className="w-5 h-5" />
                        <span className="text-[10px] font-medium">History</span>
                    </button>
                </nav>

                <div className="mt-auto">
                    <StatusBadge connected={connected} />
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {currentView === 'agent' ? (
                    <main className="flex-1 flex overflow-hidden">
                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col relative z-10 w-full transition-all duration-500`}>
                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                        <Bot className="w-16 h-16" />
                                        <p>Ready to test. How can I help?</p>
                                    </div>
                                ) : (
                                    messages.map(msg => <MessageItem key={msg.id} msg={msg} />)
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-white/5">
                                <div className="relative group max-w-3xl mx-auto">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                                    <div className="relative bg-card border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                                        <div className="pl-4 pr-3 text-muted-foreground">
                                            <Terminal className="w-6 h-6" />
                                        </div>
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50 h-10 text-white disabled:opacity-50"
                                            placeholder={connected ? (isProcessing ? "Agent is working..." : "Ask me to test something...") : "Connecting..."}
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
                        {snapshot && (
                            <div className="w-[45%] border-l border-white/5 bg-black/50 backdrop-blur-sm p-4 flex flex-col gap-2 animate-in slide-in-from-right-10 fade-in duration-500">
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
                ) : (
                    <HistoryView />
                )}
            </div>
        </div>
    )
}

export default App
