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
  const [isChannelSubscribed, setIsChannelSubscribed] = useState(false); // New state for channel subscription

  useImperativeHandle(ref, () => ({
    startCamera,
    stopCamera,
  }));

  // Setup Supabase channel for signaling
  useEffect(() => {
    if (isCameraActive && user.id && !channelRef.current) {
      const channel = supabase.channel(`webrtc-signaling-${user.id}`);
      channel.subscribe(async (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to channel webrtc-signaling-${user.id}`);
          setIsChannelSubscribed(true); // Set subscribed status to true
        }
      });
      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsChannelSubscribed(false); // Reset subscribed status on cleanup
      }
    };
  }, [isCameraActive, user.id]);

  // Manejar encendido de cámara
  const startCamera = async () => {
    try {
      setError(null)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Tu navegador no soporta el acceso a la cámara o la página no se está sirviendo sobre HTTPS.")
        console.error("Camera access not supported or not on HTTPS.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: ['environment', 'user'], // Try environment-facing camera first, then user-facing
          width: { min: 320 }, // Minimum width
          height: { min: 240 }, // Minimum height
        },
      });

      console.log("Stream obtained:", stream);
      streamRef.current = stream;
      setIsCameraActive(true);

    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotReadableError') {
          setError("La cámara está en uso por otra aplicación. Cierra otras apps que usen la cámara e intenta de nuevo.")
          console.error("Camera access error: NotReadableError", err)
        } else if (err.name === 'NotAllowedError') {
          setError("Permiso denegado. Habilita el acceso a la cámara en la barra de dirección del navegador (icono de candado/cámara).")
          console.error("Camera access error: NotAllowedError", err)
        } else if (err.name === 'NotFoundError') {
          setError("No se detectó ninguna cámara. Verifica que esté conectada correctamente.")
          console.error("Camera access error: NotFoundError", err)
        } else {
          setError(`Error de cámara: ${err.message}. Verifica permisos y conexión.`)
          console.error("Camera access error:", err)
        }
      } else {
        setError("Error inesperado al acceder a la cámara.")
        console.error("Unexpected camera access error:", err)
      }
      setIsCameraActive(false)
    }
  }

  // Manejar apagado de cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsChannelSubscribed(false); // Reset subscribed status on stop
    }
    setIsCameraActive(false)
    setError(null)
  }

  // WebRTC setup effect
  useEffect(() => {
    if (isCameraActive && isChannelSubscribed && streamRef.current && user.id) {
      console.log("Initiating WebRTC setup...");
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = peerConnection;

      streamRef.current.getTracks().forEach(track => peerConnection.addTrack(track, streamRef.current!));

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate', event.candidate);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate, senderId: user.id },
          });
        }
      };

      peerConnection.onnegotiationneeded = async () => {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log('Sending WebRTC offer', peerConnection.localDescription);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc-offer',
            payload: { sdp: peerConnection.localDescription, senderId: user.id },
          });
        } catch (err) {
          console.error('Error creating or sending offer:', err);
        }
      };

      return () => {
        console.log("Cleaning up WebRTC peer connection.");
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      };
    }
  }, [isCameraActive, isChannelSubscribed, streamRef.current, user.id]);

  // Limpiar stream, peer connection y canal al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      // Peer connection cleanup is now handled by its own useEffect
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      console.log("Video ref available, assigning srcObject.");
      videoRef.current.srcObject = streamRef.current;
    } else if (isCameraActive && !videoRef.current) {
      console.log("Video ref not available when assigning srcObject, but camera is active.");
    }
  }, [streamRef.current, videoRef.current, isCameraActive]);

  // Listen for signaling messages from the admin
  useEffect(() => {
    const currentChannel = channelRef.current;
    if (!currentChannel || !peerConnectionRef.current) return;

    const handleWebRTCSignaling = async (payload: any) => {
      if (payload.event === 'webrtc-answer' && payload.senderId !== user.id) {
        console.log('Received WebRTC answer', payload.sdp)
        if (peerConnectionRef.current && payload.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } else if (payload.event === 'ice-candidate' && payload.senderId !== user.id) {
        console.log('Received ICE candidate', payload.candidate)
        if (peerConnectionRef.current && payload.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } else if (payload.event === 'webrtc-offer' && payload.senderId !== user.id) {
        // This case should ideally not happen on the driver's side, as driver initiates offer
        // But if it does, we can handle it by setting remote description and sending an answer
        console.log('Received unexpected WebRTC offer from admin', payload.sdp);
        if (peerConnectionRef.current && payload.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'webrtc-answer',
            payload: { sdp: peerConnectionRef.current.localDescription, senderId: user.id },
          });
        }
      }
    }

    currentChannel.on('broadcast', { event: 'webrtc-answer' }, handleWebRTCSignaling)
    currentChannel.on('broadcast', { event: 'ice-candidate' }, handleWebRTCSignaling)
    currentChannel.on('broadcast', { event: 'webrtc-offer' }, handleWebRTCSignaling)

    return () => {
      // Use the captured channel for cleanup
      // Explicit off calls are not needed as supabase.removeChannel handles this
    }
  }, [user.id, channelRef.current, peerConnectionRef.current, isChannelSubscribed]) // Added isChannelSubscribed to dependencies

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
        {isCameraActive && streamRef.current && (
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
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