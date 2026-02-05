import React, { useState, useEffect } from 'react'
import { X, Save, Globe, Server } from 'lucide-react'
import { Socket } from 'socket.io-client'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    socket: Socket | null
}

export default function SettingsModal({ isOpen, onClose, socket }: SettingsModalProps) {
    const [baseUrl, setBaseUrl] = useState('')
    const [envName, setEnvName] = useState('')

    // Ideally we fetch current config from backend on open, 
    // but for now we'll just let the user set it. 
    // Or we could listen for 'env_config_updated' in parent and pass props down.

    const handleSave = () => {
        if (!socket) return
        if (baseUrl) socket.emit('update_env_config', { key: 'BASE_URL', value: baseUrl })
        if (envName) socket.emit('update_env_config', { key: 'ENV_NAME', value: envName })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary" />
                        Environment Settings
                    </h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            Base URL
                        </label>
                        <input
                            type="text"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-mono text-sm"
                            placeholder="https://example.com"
                            value={baseUrl}
                            onChange={e => setBaseUrl(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">The default URL the agent will start at or use for relative paths.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Environment Name
                        </label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                            value={envName}
                            onChange={e => setEnvName(e.target.value)}
                        >
                            <option value="" disabled>Select Environment</option>
                            <option value="Production">Production</option>
                            <option value="Staging">Staging</option>
                            <option value="Development">Development</option>
                            <option value="QA">QA</option>
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-muted/20 flex gap-3 justify-end border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    )
}
