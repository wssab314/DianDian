import React from 'react'
import { Monitor, Smartphone, Tablet } from 'lucide-react'

interface DeviceSelectorProps {
    currentPreset: string
    onSelect: (preset: string) => void
    disabled: boolean
}

export const DEVICE_PRESETS = [
    { id: 'desktop', name: 'Desktop', icon: Monitor, width: 1280, height: 800 },
    { id: 'iphone-14-pro', name: 'iPhone 14 Pro', icon: Smartphone, width: 393, height: 852 },
    { id: 'half-screen', name: 'Split Screen', icon: Smartphone, width: 900, height: 1080 }, // Example custom
    { id: 'pixel-7', name: 'Pixel 7', icon: Smartphone, width: 412, height: 915 },
    { id: 'ipad-pro', name: 'iPad Pro', icon: Tablet, width: 1024, height: 1366 },
]

export default function DeviceSelector({ currentPreset, onSelect, disabled }: DeviceSelectorProps) {
    const active = DEVICE_PRESETS.find(p => p.id === currentPreset) || DEVICE_PRESETS[0]
    const Icon = active.icon

    return (
        <div className="relative group z-50">
            <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs font-medium text-slate-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={disabled}
            >
                <Icon className="w-3.5 h-3.5" />
                <span>{active.name}</span>
            </button>

            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
                <div className="p-1">
                    {DEVICE_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => onSelect(preset.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${currentPreset === preset.id
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                        >
                            <preset.icon className="w-3.5 h-3.5" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{preset.name}</span>
                                <span className="text-[10px] opacity-50">{preset.width}x{preset.height}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
