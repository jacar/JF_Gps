"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { AlertTriangle } from "lucide-react"

interface AdminCameraViewerProps {
  adminUser: User
}

export function AdminCameraViewer({ adminUser }: AdminCameraViewerProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<User[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected')
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [isChannelSubscribed, setIsChannelSubscribed] = useState(false);
  const [isVideoReceived, setIsVideoReceived] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Fetch drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'driver')

        if (error) throw error;
        setDrivers(data || [])
        if (data && data.length > 0) {
          setSelectedDriverId(data[0].id)
        }
      } catch (err: any) {
        console.error("Error fetching drivers:", err)
        setError(`Error al cargar conductores: ${err.message}`)
      } finally {
        setLoadingDrivers(false)
      }
    }
    fetchDrivers()
  }, [])

  // Manage Channel Subscription for Selected Driver
  useEffect(() => {
    if (!selectedDriverId) return;

    // Cleanup previous channel/stream if any
    stopStream();

    const channelName = `webrtc-signaling-${selectedDriverId}`;
    console.log(`[AdminViewer] Subscribing to ${channelName}`);

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'webrtc-offer' }, async (payload: { payload: { targetId: string, senderId: string, sdp: RTCSessionDescriptionInit } }) => {
        console.log('[AdminViewer] Received offer', payload);
        if (payload.payload.targetId === adminUser.id || payload.payload.senderId === selectedDriverId) {
          await handleOffer(payload.payload.sdp, payload.payload.senderId);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: { payload: { targetId: string, senderId: string, candidate: RTCIceCandidateInit } }) => {
        console.log('[AdminViewer] Received ICE candidate', payload);
        if ((payload.payload.targetId === adminUser.id || payload.payload.senderId === selectedDriverId) && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) {
            console.error('[AdminViewer] Error adding ICE candidate:', e);
          }
        }
      })
      .on('broadcast', { event: 'camera-status' }, (payload: { payload: { senderId: string, status: string } }) => {
        console.log('[AdminViewer] Camera status update:', payload);
        if (payload.payload.senderId === selectedDriverId) {
          if (payload.payload.status === 'inactive') {
            stopStream();
            setError("El conductor ha apagado la cámara.");
          } else {
            setError(null); // Camera back online
          }
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[AdminViewer] Subscribed to ${channelName}`);
          setIsChannelSubscribed(true);
        } else {
          setIsChannelSubscribed(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[AdminViewer] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsChannelSubscribed(false);
    };
  }, [selectedDriverId, adminUser.id]);

  const handleOffer = async (sdp: RTCSessionDescriptionInit, senderId: string) => {
    if (senderId !== selectedDriverId) return;

    // Create PC if not exists (it shouldn't for an offer, usually)
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[AdminViewer] Received remote track', event.streams[0]);
      setDebugInfo(prev => prev + `\nTrack received: ${event.track.kind}`);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => console.error("Error playing video:", e));
        setIsVideoReceived(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, senderId: adminUser.id, targetId: selectedDriverId },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[AdminViewer] Connection state:', pc.connectionState);
      setDebugInfo(prev => prev + `\nState: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') setConnectionStatus('failed');
      if (pc.connectionState === 'connected') setConnectionStatus('connected');
      if (pc.connectionState === 'disconnected') setConnectionStatus('disconnected');
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log('[AdminViewer] Sending answer...');
      channelRef.current?.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { sdp: answer, senderId: adminUser.id, targetId: selectedDriverId },
      });
    } catch (err) {
      console.error('[AdminViewer] Error handling offer:', err);
      setConnectionStatus('failed');
    }
  };

  const startStream = async () => {
    if (!selectedDriverId || !isChannelSubscribed) {
      setError("Esperando conexión con el canal de señalización...");
      return;
    }

    setError(null);
    setConnectionStatus('connecting');
    setIsVideoReceived(false);
    setDebugInfo("Iniciando...");
    console.log('[AdminViewer] Requesting stream...');

    channelRef.current?.send({
      type: 'broadcast',
      event: 'request-stream',
      payload: { senderId: adminUser.id, targetId: selectedDriverId },
    });

    // Set a timeout to warn if no response
    setTimeout(() => {
      if (connectionStatus === 'connecting') {
        // setError("No se recibió respuesta del conductor. Verifique que su cámara esté encendida.");
        // Don't hard fail, just warn
      }
    }, 5000);
  }

  const stopStream = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setConnectionStatus('disconnected');
    setIsVideoReceived(false);
    setDebugInfo("");
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visualizador de Cámara de Conductor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Select
            onValueChange={(value) => setSelectedDriverId(value)}
            value={selectedDriverId || ""}
            disabled={loadingDrivers || connectionStatus === 'connected'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar Conductor" />
            </SelectTrigger>
            <SelectContent>
              {loadingDrivers ? (
                <SelectItem value="loading" disabled>Cargando conductores...</SelectItem>
              ) : drivers.length > 0 ? (
                drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-drivers" disabled>No hay conductores disponibles</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={connectionStatus === 'connected' || connectionStatus === 'connecting' ? stopStream : startStream}
            disabled={!selectedDriverId || !isChannelSubscribed}
            variant={connectionStatus === 'connected' ? "destructive" : "default"}
          >
            {connectionStatus === 'connected' ? "Detener Stream" : connectionStatus === 'connecting' ? "Conectando..." : "Iniciar Stream"}
          </Button>

          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isChannelSubscribed ? 'bg-green-500' : 'bg-red-500'}`} title="Estado de Señalización"></span>
            <span className="text-xs text-muted-foreground">{isChannelSubscribed ? 'Señalización OK' : 'Sin Señalización'}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {(connectionStatus === 'connected' || connectionStatus === 'connecting') && (
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {connectionStatus === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                <p>Esperando video...</p>
              </div>
            )}
            {connectionStatus === 'connected' && !isVideoReceived && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">
                <div className="text-center">
                  <p className="font-bold">Conectado, esperando video...</p>
                  <p className="text-xs text-gray-300 mt-2">Si esto persiste, el conductor podría tener problemas de red.</p>
                </div>
              </div>
            )}

            {/* Debug Overlay */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] p-1 rounded font-mono whitespace-pre pointer-events-none opacity-50 hover:opacity-100">
              {debugInfo}
            </div>
          </div>
        )}

        {connectionStatus === 'disconnected' && !error && (
          <p className="text-sm text-muted-foreground">
            Selecciona un conductor y haz clic en "Iniciar Stream" para ver su cámara.
          </p>
        )}
      </CardContent>
    </Card>
  )
}