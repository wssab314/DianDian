import { Minus, Square, X, Sparkles } from 'lucide-react'

const TitleBar = () => {
    const handleMinimize = () => {
        // @ts-ignore
        window.electronAPI?.minimize()
    }

    const handleMaximize = () => {
        // @ts-ignore
        window.electronAPI?.maximize()
    }

    const handleClose = () => {
        // @ts-ignore
        window.electronAPI?.close()
    }

    const isMac = window.navigator.userAgent.includes('Mac')

    return (
        <div className="h-10 bg-background border-b border-white/5 flex items-center justify-between select-none" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className={`flex items-center gap-2 ${isMac ? 'pl-[80px]' : 'pl-4'}`}>
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-wider">点点 AI</span>
                <span className="text-[10px] text-slate-500 font-medium ml-2 opacity-50">神经测试代理</span>
            </div>

            {!isMac && (
                <div className="flex items-center h-full no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        onClick={handleMinimize}
                        className="h-full px-4 hover:bg-white/5 text-slate-400 transition-colors"
                        title="最小化"
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="h-full px-4 hover:bg-white/5 text-slate-400 transition-colors"
                        title="最大化"
                    >
                        <Square className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleClose}
                        className="h-full px-4 hover:bg-red-500/80 hover:text-white text-slate-400 transition-colors group"
                        title="关闭"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default TitleBar
