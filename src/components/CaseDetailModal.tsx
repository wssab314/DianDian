import { X, Play, FileJson, Clock, ListOrdered, AlignLeft } from 'lucide-react'

interface TestCase {
    id: number
    name: string
    description: string
    prompts: string[]
    created_at: string
}

interface CaseDetailModalProps {
    isOpen: boolean
    onClose: () => void
    testCase: TestCase | null
    onReplay: (caseId: number) => void
    connected: boolean
}

export default function CaseDetailModal({ isOpen, onClose, testCase, onReplay, connected }: CaseDetailModalProps) {
    if (!isOpen || !testCase) return null

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                            <FileJson className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-medium text-white tracking-tight">
                                {testCase.name}
                            </h3>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5 uppercase tracking-widest">
                                <Clock className="w-3 h-3" />
                                {new Date(testCase.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar flex-1">
                    {/* Description Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary/70">
                            <AlignLeft className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">用例描述 (Description)</span>
                        </div>
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-slate-300 text-sm leading-relaxed min-h-[60px]">
                            {testCase.description || "无详细描述信息。"}
                        </div>
                    </div>

                    {/* Steps Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary/70">
                            <ListOrdered className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">执行步骤 (Execution Chain)</span>
                        </div>
                        <div className="space-y-3">
                            {testCase.prompts.map((prompt, idx) => (
                                <div key={idx} className="group relative pl-10 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                                    <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-black/20 text-primary/40 font-mono text-sm group-hover:text-primary transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="text-slate-200 text-sm font-medium">
                                        {prompt}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-muted/20 flex gap-4 justify-end border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                        关闭窗口
                    </button>
                    <button
                        onClick={() => {
                            onReplay(testCase.id)
                            onClose()
                        }}
                        disabled={!connected}
                        className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        立即执行回放
                    </button>
                </div>
            </div>
        </div>
    )
}
