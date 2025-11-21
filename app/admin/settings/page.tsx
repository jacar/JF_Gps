"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, Bell, MapPin, Shield, Database } from "lucide-react"

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [settings, setSettings] = useState({
        // General
        company_name: "GPS JF Corp",
        company_email: "admin@gpsjf.com",
        company_phone: "+51 999 999 999",

        // Notifications
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,

        // Tracking
        update_interval: 30,
        speed_limit: 100,
        geofence_alerts: true,

        // Map
        default_zoom: 13,
        map_style: "streets",

        // Database
        backup_frequency: "daily",
        retention_days: 90,
    })

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
        setLoading(false)
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const handleSave = async () => {
        setSaving(true)
        // Simulate API call
        setTimeout(() => {
            setSaving(false)
            alert("Configuración guardada exitosamente")
        }, 1000)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando configuración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminSidebar onLogout={handleLogout} userName={user?.full_name} />

            <div className="flex-1 ml-64 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                            <p className="text-sm text-gray-500 mt-1">Administra las configuraciones del sistema</p>
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2d5a8f]">
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-4xl space-y-6">
                        {/* General Settings */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Settings className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Configuración General</h2>
                                    <p className="text-sm text-gray-500">Información básica de la empresa</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="company_name">Nombre de la Empresa</Label>
                                    <Input
                                        id="company_name"
                                        value={settings.company_name}
                                        onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="company_email">Email</Label>
                                        <Input
                                            id="company_email"
                                            type="email"
                                            value={settings.company_email}
                                            onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="company_phone">Teléfono</Label>
                                        <Input
                                            id="company_phone"
                                            value={settings.company_phone}
                                            onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Bell className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
                                    <p className="text-sm text-gray-500">Configura las alertas del sistema</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Notificaciones por Email</Label>
                                        <p className="text-sm text-gray-500">Recibir alertas por correo electrónico</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.email_notifications}
                                        onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Notificaciones por SMS</Label>
                                        <p className="text-sm text-gray-500">Recibir alertas por mensaje de texto</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.sms_notifications}
                                        onChange={(e) => setSettings({ ...settings, sms_notifications: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Notificaciones Push</Label>
                                        <p className="text-sm text-gray-500">Recibir notificaciones en el navegador</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.push_notifications}
                                        onChange={(e) => setSettings({ ...settings, push_notifications: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tracking Settings */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <MapPin className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Rastreo GPS</h2>
                                    <p className="text-sm text-gray-500">Configuración del sistema de rastreo</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="update_interval">Intervalo de Actualización (segundos)</Label>
                                    <Input
                                        id="update_interval"
                                        type="number"
                                        value={settings.update_interval}
                                        onChange={(e) => setSettings({ ...settings, update_interval: parseInt(e.target.value) })}
                                        min="10"
                                        max="300"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Frecuencia de actualización de ubicación</p>
                                </div>
                                <div>
                                    <Label htmlFor="speed_limit">Límite de Velocidad (km/h)</Label>
                                    <Input
                                        id="speed_limit"
                                        type="number"
                                        value={settings.speed_limit}
                                        onChange={(e) => setSettings({ ...settings, speed_limit: parseInt(e.target.value) })}
                                        min="0"
                                        max="200"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Velocidad máxima permitida antes de generar alerta</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Alertas de Geocerca</Label>
                                        <p className="text-sm text-gray-500">Notificar cuando un vehículo sale de zona permitida</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.geofence_alerts}
                                        onChange={(e) => setSettings({ ...settings, geofence_alerts: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Map Settings */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <MapPin className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Configuración del Mapa</h2>
                                    <p className="text-sm text-gray-500">Personaliza la visualización del mapa</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="default_zoom">Zoom Predeterminado</Label>
                                    <Input
                                        id="default_zoom"
                                        type="number"
                                        value={settings.default_zoom}
                                        onChange={(e) => setSettings({ ...settings, default_zoom: parseInt(e.target.value) })}
                                        min="1"
                                        max="20"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="map_style">Estilo del Mapa</Label>
                                    <select
                                        id="map_style"
                                        value={settings.map_style}
                                        onChange={(e) => setSettings({ ...settings, map_style: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                    >
                                        <option value="streets">Calles</option>
                                        <option value="satellite">Satélite</option>
                                        <option value="hybrid">Híbrido</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Database Settings */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Database className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Base de Datos</h2>
                                    <p className="text-sm text-gray-500">Configuración de respaldos y retención</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="backup_frequency">Frecuencia de Respaldo</Label>
                                    <select
                                        id="backup_frequency"
                                        value={settings.backup_frequency}
                                        onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                    >
                                        <option value="hourly">Cada hora</option>
                                        <option value="daily">Diario</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensual</option>
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="retention_days">Días de Retención de Datos</Label>
                                    <Input
                                        id="retention_days"
                                        type="number"
                                        value={settings.retention_days}
                                        onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
                                        min="30"
                                        max="365"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Tiempo que se mantienen los datos históricos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
