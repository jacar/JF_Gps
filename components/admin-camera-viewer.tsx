"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { AlertTriangle, Video, VideoOff } from "lucide-react"

interface AdminCameraViewerProps {
  adminUser: User
}

export function AdminCameraViewer({ adminUser }: AdminCameraViewerProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<User[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [queuedIceCandidates, setQueuedIceCandidates] = useState<RTCIceCandidateInit[]>([]);
  const [isChannelSubscribed, setIsChannelSubscribed] = useState(false);

  useEffect(() => {
    const fetchDrivers = async () => {
      console.log("fetchDrivers called.");
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name') // Changed from 'id, email, full_name'
          .eq('role', 'driver')

        if (error) {
          console.error("Error fetching drivers:", error.message || error)
          setError(`Error al cargar conductores: ${error.message || error}`)
        } else {
          setDrivers(data || [])
          if (data && data.length > 0) {
            setSelectedDriverId(data[0].id)
            console.log("Initial selectedDriverId set to:", data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching drivers:", err)
        setError(`Error al cargar conductores: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoadingDrivers(false)
      }
    }

    fetchDrivers()
  }, [])

  useEffect(() => {
    console.log("Channel subscription useEffect triggered. selectedDriverId:", selectedDriverId, "channelRef.current:", channelRef.current);
    if (selectedDriverId && !channelRef.current) {
      console.log("Attempting to subscribe to channel for selectedDriverId:", selectedDriverId);
      const channel = supabase.channel(`webrtc-signaling-${selectedDriverId}`)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to WebRTC signaling channel for driver ${selectedDriverId} (admin)`);
          setIsChannelSubscribed(true);
          console.log("isChannelSubscribed set to true.");
        }
      })
      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current) {
        console.log("Unsubscribing from channel for selectedDriverId:", selectedDriverId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsChannelSubscribed(false);
        console.log("isChannelSubscribed set to false.");
      }
    };
  }, [selectedDriverId]);

  useEffect(() => {
    console.log("isChannelSubscribed changed to:", isChannelSubscribed);
    if (isChannelSubscribed && channelRef.current && selectedDriverId) {
      const currentChannel = channelRef.current;

      const handleOffer = async (payload: any) => {
        console.log("handleOffer triggered. Payload senderId:", payload.payload.senderId, "Selected Driver ID:", selectedDriverId);
        if (payload.payload.senderId === selectedDriverId) {
          console.log('Received WebRTC offer from driver', payload.payload.sdp);

          // Process any queued ICE candidates
          queuedIceCandidates.forEach(candidate => {
            peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          });
          setQueuedIceCandidates([]); // Clear the queue

          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          console.log('Sending WebRTC answer to driver', answer);
          currentChannel.send({
            type: 'broadcast',
            event: 'webrtc-answer',
            payload: { sdp: answer?.sdp, senderId: adminUser.id },
          });
        } else {
          console.warn("Offer received for a different driver. Expected:", selectedDriverId, "Received:", payload.payload.senderId);
        }
      };

      const handleCandidate = async (payload: any) => {
        console.log("handleCandidate triggered. Payload senderId:", payload.payload.senderId, "Selected Driver ID:", selectedDriverId);
        if (payload.payload.senderId === selectedDriverId && payload.payload.candidate) {
          console.log('Received ICE candidate from driver', payload.payload.candidate);
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } else {
            // Queue the candidate if peerConnection is not yet initialized
            setQueuedIceCandidates(prev => [...prev, payload.payload.candidate]);
          }
        } else if (payload.payload.senderId !== selectedDriverId) {
          console.warn("ICE candidate received for a different driver. Expected:", selectedDriverId, "Received:", payload.payload.senderId);
        }
      };

      currentChannel.on('broadcast', { event: 'webrtc-offer' }, handleOffer);
      currentChannel.on('broadcast', { event: 'ice-candidate' }, handleCandidate);

      return () => {
        // Supabase's removeChannel implicitly handles listener cleanup,
        // so explicit `off` calls for broadcast events are not strictly necessary here
        // if the channel itself is being removed. However, if the channel
        // persists but we want to stop listening to these specific events,
        // explicit `off` calls would be needed. For this scenario,
        // relying on channel removal is sufficient.
      };
    }
  }, [isChannelSubscribed, channelRef.current, selectedDriverId, adminUser.id, queuedIceCandidates]);

  const startStream = async () => {
    if (!selectedDriverId) {
      setError("Por favor, selecciona un conductor para iniciar el stream.")
      return
    }

    if (!isChannelSubscribed) {
      setError("El canal de señalización no está suscrito. Inténtalo de nuevo en unos segundos.")
      console.warn("Attempted to start stream before channel was subscribed.")
      return
    }

    setError(null)
    setIsStreaming(true)

    if (!peerConnectionRef.current) {
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate (admin)', event.candidate);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate, senderId: adminUser.id },
          });
        }
      };
    }

    // Process any queued ICE candidates that might have arrived before the peer connection was fully set up
    queuedIceCandidates.forEach(candidate => {
      peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });
    setQueuedIceCandidates([]); // Clear the queue
    // The ontrack and onicecandidate handlers are also set up in handleOffer.

  }

  const stopStream = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (channelRef.current) {
      console.log("Stopping stream: Unsubscribing from channel for selectedDriverId:", selectedDriverId);
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsChannelSubscribed(false);
      console.log("isChannelSubscribed set to false.");
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setError(null)
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
            onValueChange={(value) => {
              console.log("Select onValueChange: Setting selectedDriverId to", value);
              setSelectedDriverId(value);
            }}
            value={selectedDriverId || ""}
            disabled={loadingDrivers || isStreaming}
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
          <Button onClick={isStreaming ? stopStream : startStream} disabled={!selectedDriverId || loadingDrivers}>
            {isStreaming ? "Detener Stream" : "Iniciar Stream"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {isStreaming && (
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {!isStreaming && !error && (
          <p className="text-sm text-muted-foreground">
            Selecciona un conductor y haz clic en "Iniciar Stream" para ver su cámara.
          </p>
        )}
      </CardContent>
    </Card>
  )
}