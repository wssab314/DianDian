import { useEffect, useState } from 'react'
import { Play, FileJson, Clock } from 'lucide-react'
import { Socket } from 'socket.io-client'
import CaseDetailModal from './CaseDetailModal'

interface TestCase {
    id: number
    name: string
    description: string
    prompts: string[]
    created_at: string
}

interface LibraryViewProps {
    socket: Socket | null
    connected: boolean
}

export default function LibraryView({ socket, connected }: LibraryViewProps) {
    const [cases, setCases] = useState<TestCase[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null)

    useEffect(() => {
        if (!socket) return

        // Request list on mount
        socket.emit('load_cases', {})

        socket.on('cases_list', (data: TestCase[]) => {
            setCases(data)
            setIsLoading(false)
        })

        return () => {
            socket.off('cases_list')
        }
    }, [socket])

    const handleReplay = (caseId: number) => {
        if (!socket || !connected) return
        socket.emit('replay_case', { case_id: caseId })
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-black/20 text-slate-200 overflow-hidden">
            {/* Header */}
            <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-light text-white tracking-wide">测试用例库</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {cases.length} 个已保存的工作流可供回放
                    </p>
                </div>
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 align-start content-start">
                {cases.map((testCase) => (
                    <div
                        key={testCase.id}
                        onClick={() => setSelectedCase(testCase)}
                        className="group bg-card border border-white/5 hover:border-primary/50 rounded-xl p-5 transition-all hover:shadow-2xl hover:bg-white/[0.02] flex flex-col gap-4 relative overflow-hidden cursor-pointer active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Future: Delete button */}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <FileJson className="w-5 h-5" />
                                </div>
                                <h3 className="font-medium text-lg text-white truncate">{testCase.name}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                                {testCase.description || "无描述信息。"}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                            <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {new Date(testCase.created_at).toLocaleString()}
                            </div>

                            <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-slate-400 space-y-1">
                                <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">步骤 (STEPS)</div>
                                {testCase.prompts.slice(0, 3).map((prompt, idx) => (
                                    <div key={idx} className="truncate flex gap-2">
                                        <span className="text-primary/50">{idx + 1}.</span>
                                        {prompt}
                                    </div>
                                ))}
                                {testCase.prompts.length > 3 && (
                                    <div className="text-center opacity-50 text-[10px] pt-1">
                                        + 还有 {testCase.prompts.length - 3} 个步骤
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleReplay(testCase.id)
                            }}
                            disabled={!connected}
                            className="mt-2 w-full py-3 rounded-lg bg-white/5 hover:bg-primary hover:text-white border border-white/10 hover:border-transparent transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-primary/20 group-hover:text-primary z-10"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            执行自动化
                        </button>
                    </div>
                ))}

                {cases.length === 0 && !isLoading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                        <FileJson className="w-16 h-16 mb-4 stroke-1" />
                        <p>暂无保存的用例。</p>
                        <p className="text-sm">运行一个对话并点击 "保存测试用例" 按钮来创建一个。</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <CaseDetailModal
                isOpen={!!selectedCase}
                onClose={() => setSelectedCase(null)}
                testCase={selectedCase}
                onReplay={handleReplay}
                connected={connected}
            />
        </div>
    )
}


