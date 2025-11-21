"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/app/actions"
import { UserPlus, ArrowLeft } from "lucide-react"
import type { User } from "@/lib/types"

export default function CreateDriverPage() {
    const [user, setUser] = useState<User | null>(null)
    const [phoneNumber, setPhoneNumber] = useState("")
    const [fullName, setFullName] = useState("")
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [imei, setImei] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        const userData = localStorage.getItem("gps_jf_user")
        if (!userData) {
            router.push("/")
            return
        }
        const parsedUser = JSON.parse(userData)
        if (parsedUser.role !== "admin") {
            router.push("/driver")
            return
        }
        setUser(parsedUser)
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await createUser(
                phoneNumber,
                fullName,
                "driver",
                vehicleNumber,
                imei,
                undefined, // Latitud inicial (opcional o 0)
                undefined  // Longitud inicial (opcional o 0)
            )

            router.push("/admin") // Volver al dashboard o lista de conductores
        } catch (err: any) {
            setError(err.message || "Error al crear conductor")
            setLoading(false)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminSidebar onLogout={() => {
                localStorage.removeItem("gps_jf_user")
                router.push("/")
            }} userName={user?.full_name} />

            <div className="flex-1 ml-64 flex flex-col overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Registrar Nuevo Conductor</h1>
                            <p className="text-sm text-gray-500 mt-1">Añade un nuevo conductor al sistema</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-[#1e3a5f]" />
                                Información del Conductor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Nombre Completo</Label>
                                        <Input
                                            id="fullName"
                                            placeholder="Ej: Juan Pérez"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono (Usuario)</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+58..."
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicle">Vehículo Asignado</Label>
                                        <Input
                                            id="vehicle"
                                            placeholder="Ej: V001"
                                            value={vehicleNumber}
                                            onChange={(e) => setVehicleNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="imei">IMEI (Opcional)</Label>
                                        <Input
                                            id="imei"
                                            placeholder="Ej: 123456789012345"
                                            value={imei}
                                            onChange={(e) => setImei(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => router.back()}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d5a8f]" disabled={loading}>
                                        {loading ? "Guardando..." : "Registrar Conductor"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
