"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { AlertTriangle, Video, VideoOff, Maximize2, Eye, EyeOff } from "lucide-react"
import { CameraThumbnail } from "./camera-thumbnail"

interface AdminCameraViewerProps {
  adminUser: User
}

interface StreamConnection {
  peerConnection: RTCPeerConnection | null
  channel: ReturnType<typeof createClient>['channel'] | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: 'disconnected' | 'connecting' | 'connected' | 'failed'
  isSubscribed: boolean
}

export function AdminCameraViewer({ adminUser }: AdminCameraViewerProps) {
  const [drivers, setDrivers] = useState<User[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStreams, setActiveStreams] = useState<Map<string, StreamConnection>>(new Map())
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('role', 'driver')

        if (error) throw error
        setDrivers(data || [])
      } catch (err: any) {
        console.error("Error fetching drivers:", err)
        setError(`Error al cargar conductores: ${err.message}`)
      } finally {
        setLoadingDrivers(false)
      }
    }
    fetchDrivers()
  }, [])

  // Cleanup all streams on unmount
  useEffect(() => {
    return () => {
      activeStreams.forEach((stream, driverId) => {
        stopStream(driverId)
      })
    }
  }, [])

  const createVideoRef = (): React.RefObject<HTMLVideoElement | null> => {
    return { current: null }
  }

  const setupStreamConnection = async (driverId: string) => {
    const channelName = `webrtc-signaling-${driverId}`
    console.log(`[AdminViewer] Setting up connection for ${driverId}`)

    const videoRef = createVideoRef()
    const channel = supabase.channel(channelName)

    const streamConnection: StreamConnection = {
      peerConnection: null,
      channel,
      videoRef,
      status: 'connecting',
      isSubscribed: false
    }

    // Update state
    setActiveStreams(prev => new Map(prev).set(driverId, streamConnection))

    channel
      .on('broadcast', { event: 'webrtc-offer' }, async (payload: { payload: { targetId: string, senderId: string, sdp: RTCSessionDescriptionInit } }) => {
        console.log('[AdminViewer] Received offer from', payload.payload.senderId)
        if (payload.payload.senderId === driverId) {
          await handleOffer(driverId, payload.payload.sdp)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: { payload: { targetId: string, senderId: string, candidate: RTCIceCandidateInit } }) => {
        console.log('[AdminViewer] Received ICE candidate from', payload.payload.senderId)
        if (payload.payload.senderId === driverId) {
          const stream = activeStreams.get(driverId)
          if (stream?.peerConnection) {
            try {
              await stream.peerConnection.addIceCandidate(new RTCIceCandidate(payload.payload.candidate))
            } catch (e) {
              console.error('[AdminViewer] Error adding ICE candidate:', e)
            }
          }
        }
      })
      .on('broadcast', { event: 'camera-status' }, (payload: { payload: { senderId: string, status: string } }) => {
        console.log('[AdminViewer] Camera status update:', payload)
        if (payload.payload.senderId === driverId && payload.payload.status === 'inactive') {
          stopStream(driverId)
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[AdminViewer] Subscribed to ${channelName}`)
          setActiveStreams(prev => {
            const updated = new Map(prev)
            const stream = updated.get(driverId)
            if (stream) {
              stream.isSubscribed = true
              updated.set(driverId, stream)
            }
            return updated
          })

          // Request stream after subscription
          setTimeout(() => requestStream(driverId), 500)
        }
      })
  }

  const requestStream = (driverId: string) => {
    const stream = activeStreams.get(driverId)
    if (!stream?.isSubscribed) return

    console.log('[AdminViewer] Requesting stream from', driverId)
    stream.channel?.send({
      type: 'broadcast',
      event: 'request-stream',
      payload: { senderId: adminUser.id, targetId: driverId }
    })
  }

  const handleOffer = async (driverId: string, sdp: RTCSessionDescriptionInit) => {
    const stream = activeStreams.get(driverId)
    if (!stream) return

    // Close existing peer connection if any
    if (stream.peerConnection) {
      stream.peerConnection.close()
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    pc.ontrack = (event) => {
      console.log('[AdminViewer] Received remote track from', driverId)
      if (stream.videoRef.current) {
        stream.videoRef.current.srcObject = event.streams[0]
        stream.videoRef.current.play().catch(e => console.error("Error playing video:", e))
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        stream.channel?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, senderId: adminUser.id, targetId: driverId }
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[AdminViewer] Connection state for ${driverId}:`, pc.connectionState)
      setActiveStreams(prev => {
        const updated = new Map(prev)
        const currentStream = updated.get(driverId)
        if (currentStream) {
          currentStream.status = pc.connectionState === 'connected' ? 'connected' :
            pc.connectionState === 'failed' ? 'failed' :
              pc.connectionState === 'disconnected' ? 'disconnected' : 'connecting'
          updated.set(driverId, currentStream)
        }
        return updated
      })
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      console.log('[AdminViewer] Sending answer to', driverId)
      stream.channel?.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { sdp: answer, senderId: adminUser.id, targetId: driverId }
      })

      // Update peer connection in state
      setActiveStreams(prev => {
        const updated = new Map(prev)
        const currentStream = updated.get(driverId)
        if (currentStream) {
          currentStream.peerConnection = pc
          updated.set(driverId, currentStream)
        }
        return updated
      })
    } catch (err) {
      console.error('[AdminViewer] Error handling offer:', err)
      setActiveStreams(prev => {
        const updated = new Map(prev)
        const currentStream = updated.get(driverId)
        if (currentStream) {
          currentStream.status = 'failed'
          updated.set(driverId, currentStream)
        }
        return updated
      })
    }
  }

  const toggleStream = (driverId: string) => {
    const stream = activeStreams.get(driverId)

    if (stream) {
      // Stop the stream
      stopStream(driverId)
    } else {
      // Start the stream
      setupStreamConnection(driverId)
    }
  }

  const stopStream = (driverId: string) => {
    const stream = activeStreams.get(driverId)
    if (!stream) return

    console.log('[AdminViewer] Stopping stream for', driverId)

    if (stream.peerConnection) {
      stream.peerConnection.close()
    }

    if (stream.channel) {
      supabase.removeChannel(stream.channel)
    }

    if (stream.videoRef.current) {
      stream.videoRef.current.srcObject = null
    }

    setActiveStreams(prev => {
      const updated = new Map(prev)
      updated.delete(driverId)
      return updated
    })
  }

  const toggleAllStreams = () => {
    if (activeStreams.size > 0) {
      // Stop all streams
      activeStreams.forEach((_, driverId) => {
        stopStream(driverId)
      })
    } else {
      // Start all streams
      drivers.forEach(driver => {
        setupStreamConnection(driver.id)
      })
    }
  }

  const handleExpand = (driverId: string) => {
    setExpandedDriverId(expandedDriverId === driverId ? null : driverId)
  }

  if (loadingDrivers) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Cargando conductores...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Monitor de Cámaras en Tiempo Real</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {drivers.length} {drivers.length === 1 ? 'conductor disponible' : 'conductores disponibles'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{activeStreams.size}</span> / {drivers.length} activas
            </div>
            <Button
              onClick={toggleAllStreams}
              variant={activeStreams.size > 0 ? "destructive" : "default"}
              className="gap-2"
            >
              {activeStreams.size > 0 ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Detener Todas
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Activar Todas
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-md mb-4">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {drivers.length === 0 ? (
          <div className="text-center py-12">
            <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay conductores disponibles</p>
          </div>
        ) : (
          <>
            {/* Grid of Camera Thumbnails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {drivers.map(driver => {
                const stream = activeStreams.get(driver.id)
                return (
                  <CameraThumbnail
                    key={driver.id}
                    driver={driver}
                    isActive={!!stream}
                    onToggle={() => toggleStream(driver.id)}
                    videoRef={stream?.videoRef || createVideoRef()}
                    connectionStatus={stream?.status || 'disconnected'}
                    onExpand={() => handleExpand(driver.id)}
                  />
                )
              })}
            </div>

            {/* Expanded View Modal */}
            {expandedDriverId && activeStreams.get(expandedDriverId) && (
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setExpandedDriverId(null)}
              >
                <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setExpandedDriverId(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 text-sm flex items-center gap-2"
                  >
                    <span>Cerrar</span>
                    <span className="text-2xl">×</span>
                  </button>

                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-black">
                      <video
                        ref={activeStreams.get(expandedDriverId)?.videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4 bg-gray-800">
                      <h3 className="text-white font-semibold text-lg">
                        {drivers.find(d => d.id === expandedDriverId)?.full_name}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Estado: {activeStreams.get(expandedDriverId)?.status === 'connected' ? 'Conectado' : 'Conectando...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}