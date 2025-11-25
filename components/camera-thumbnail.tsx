"use client"

import { RefObject } from "react"
import { Video, VideoOff, Maximize2 } from "lucide-react"
import { Button } from "./ui/button"
import type { User } from "@/lib/types"

interface CameraThumbnailProps {
    driver: User
    isActive: boolean
    onToggle: () => void
    videoRef: RefObject<HTMLVideoElement | null>
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed'
    onExpand?: () => void
}

export function CameraThumbnail({
    driver,
    isActive,
    onToggle,
    videoRef,
    connectionStatus,
    onExpand
}: CameraThumbnailProps) {
    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'bg-green-500'
            case 'connecting':
                return 'bg-yellow-500 animate-pulse'
            case 'failed':
                return 'bg-red-500'
            default:
                return 'bg-gray-400'
        }
    }

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Conectado'
            case 'connecting':
                return 'Conectando...'
            case 'failed':
                return 'Error'
            default:
                return 'Desconectado'
        }
    }

    return (
        <div className="relative group bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl">
            {/* Video Container */}
            <div className="aspect-video bg-gray-950 relative">
                {isActive && connectionStatus !== 'disconnected' ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Loading/Connecting Overlay */}
                        {connectionStatus === 'connecting' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                    <p className="text-white text-xs">Conectando...</p>
                                </div>
                            </div>
                        )}

                        {/* Failed Overlay */}
                        {connectionStatus === 'failed' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-900/30">
                                <div className="text-center">
                                    <VideoOff className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                    <p className="text-red-200 text-xs">Error de conexión</p>
                                </div>
                            </div>
                        )}

                        {/* Expand Button (visible on hover) */}
                        {onExpand && connectionStatus === 'connected' && (
                            <button
                                onClick={onExpand}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Expandir"
                            >
                                <Maximize2 className="h-3 w-3 text-white" />
                            </button>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <VideoOff className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-xs">Cámara inactiva</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Overlay - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6">
                <div className="flex items-center justify-between gap-2">
                    {/* Driver Name and Status */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                            {driver.full_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={`h-2 w-2 rounded-full ${getStatusColor()}`}></span>
                            <span className="text-xs text-gray-300">{getStatusText()}</span>
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <Button
                        onClick={onToggle}
                        size="sm"
                        variant={isActive ? "destructive" : "default"}
                        className="h-8 w-8 p-0 flex-shrink-0"
                        title={isActive ? "Detener" : "Iniciar"}
                    >
                        {isActive ? (
                            <VideoOff className="h-4 w-4" />
                        ) : (
                            <Video className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
