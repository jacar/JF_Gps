"use client"

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"

const supabase = createClient() // Initialize once outside the component

interface DriverCameraProps {
  user: User
}

export interface DriverCameraRef {
  startCamera: () => void;
  stopCamera: () => void;
}

export const DriverCamera = forwardRef<DriverCameraRef, DriverCameraProps>(({ user }, ref) => {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [isChannelSubscribed, setIsChannelSubscribed] = useState(false);

  const [debugInfo, setDebugInfo] = useState<string>("");

  useImperativeHandle(ref, () => ({
    startCamera,
    stopCamera,
  }));

  // 1. Setup Supabase channel (Persistent while component is mounted)
  useEffect(() => {
    if (!user.id) return;

    const channelName = `webrtc-signaling-${user.id}`;
    console.log(`[DriverCamera] Setting up channel: ${channelName}`);

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'request-stream' }, async (payload: { payload: { senderId: string, targetId?: string } }) => {
        console.log('[DriverCamera] Received request-stream', payload);
        // Only respond if the request is intended for this driver (or broadcast to all if no targetId, though unlikely)
        if (payload.payload.senderId !== user.id && (!payload.payload.targetId || payload.payload.targetId === user.id)) {
          // Admin wants the stream. If we have a stream, initiate offer.
          if (streamRef.current) {
            console.log('[DriverCamera] Stream available, initiating WebRTC connection...');
            await createAndSendOffer(payload.payload.senderId);
          } else {
            console.warn('[DriverCamera] Received request-stream but camera is NOT active.');
          }
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async (payload: { payload: { senderId: string, sdp: RTCSessionDescriptionInit } }) => {
        console.log('[DriverCamera] Received webrtc-answer', payload);
        if (payload.payload.senderId !== user.id && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
            console.log('[DriverCamera] Remote description set successfully');
          } catch (e) {
            console.error('[DriverCamera] Error setting remote description:', e);
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload: { payload: { senderId: string, candidate: RTCIceCandidateInit } }) => {
        console.log('[DriverCamera] Received ice-candidate', payload);
        if (payload.payload.senderId !== user.id && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) {
            console.error('[DriverCamera] Error adding ICE candidate:', e);
          }
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[DriverCamera] Subscribed to ${channelName}`);
          setIsChannelSubscribed(true);
        } else {
          console.log(`[DriverCamera] Channel status: ${status}`);
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsChannelSubscribed(false);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[DriverCamera] Cleaning up channel ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsChannelSubscribed(false);
    };
  }, [user.id]);

  // Helper to create and send offer
  const createAndSendOffer = async (targetAdminId: string) => {
    if (!streamRef.current || !channelRef.current) return;

    // Close existing PC if any to start fresh
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionRef.current = pc;

    // Add tracks
    streamRef.current.getTracks().forEach(track => {
      if (streamRef.current) {
        console.log(`[DriverCamera] Adding track: ${track.kind}, enabled: ${track.enabled}, id: ${track.id}`);
        pc.addTrack(track, streamRef.current);
      }
    });

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, senderId: user.id, targetId: targetAdminId },
        });
      }
    };

    // Create Offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[DriverCamera] Sending offer...');
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: { sdp: pc.localDescription, senderId: user.id, targetId: targetAdminId },
      });
    } catch (err) {
      console.error('[DriverCamera] Error creating offer:', err);
    }
  };

  // 2. Camera Control
  const startCamera = async () => {
    try {
      setError(null)
      setDebugInfo("Solicitando acceso a cámara...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta el acceso a la cámara.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          // Removed facingMode to let browser pick default (usually works better on laptops)
        },
        audio: false
      });

      console.log("[DriverCamera] Stream obtained", stream.id);
      setDebugInfo(prev => prev + `\nStream ID: ${stream.id}`);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setDebugInfo(prev => prev + `\nTrack: ${videoTrack.label} (${videoTrack.readyState})`);
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          console.error("Error playing local video:", e);
          setDebugInfo(prev => prev + `\nPlay Error: ${e.message}`);
        });
      }

      setIsCameraActive(true);

      // Notify that camera is ready
      if (channelRef.current && isChannelSubscribed) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'camera-status',
          payload: { status: 'active', senderId: user.id }
        });
      }

    } catch (err: any) {
      console.error("[DriverCamera] Error starting camera:", err);
      setError(`No se pudo acceder a la cámara: ${err.message || err.name}`);
      setDebugInfo(prev => prev + `\nError: ${err.message}`);
      setIsCameraActive(false);
    }
  }

  const stopCamera = () => {
    console.log("[DriverCamera] Stopping camera");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false)
    setError(null)
    setDebugInfo("");

    // Notify status
    if (channelRef.current && isChannelSubscribed) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'camera-status',
        payload: { status: 'inactive', senderId: user.id }
      });
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      console.log("Video ref available, assigning srcObject.");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error playing video in effect:", e));
    }
  }, [streamRef.current, videoRef.current, isCameraActive]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cámara del Vehículo</span>
          <Button
            variant={isCameraActive ? "destructive" : "default"}
            onClick={isCameraActive ? stopCamera : startCamera}
          >
            {isCameraActive ? "Apagar Cámara" : "Encender Cámara"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview local de la cámara */}
        {isCameraActive && (
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted // Muted locally to prevent feedback if audio is enabled later
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isChannelSubscribed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {isChannelSubscribed ? 'Conectado' : 'Reconectando...'}
              </span>
            </div>
            {/* Debug Overlay */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] p-1 rounded font-mono whitespace-pre pointer-events-none opacity-50 hover:opacity-100 max-w-full overflow-hidden">
              {`ID: ${user.id?.slice(0, 8)}...\nChannel: webrtc-signaling-${user.id?.slice(0, 8)}...\n${debugInfo}`}
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Indicador de estado */}
        <p className="text-sm text-muted-foreground">
          {isCameraActive
            ? "Cámara activa - El administrador podrá visualizar el stream cuando se conecte"
            : "Cámara apagada - Haz clic en 'Encender Cámara' para activarla"}
        </p>
      </CardContent>
    </Card>
  )
});