"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users as UsersIcon, Plus, Edit, Shield, UserCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function UsersPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<User[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const router = useRouter()
    const supabase = createClient()

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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
        loadUsers()
    }, [router])

    const loadUsers = async () => {
        try {
            const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

            if (error) throw error

            setUsers(data || [])
        } catch (error) {
            console.error("Error loading users:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredUsers = users.filter(
        (u) =>
            u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.vehicle_number && u.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    const stats = {
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        drivers: users.filter((u) => u.role === "driver").length,
        withVehicle: users.filter((u) => u.vehicle_number).length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando usuarios...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminSidebar onLogout={handleLogout} userName={user?.full_name} isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />

            <div className={`flex-1 ${isSidebarCollapsed ? "ml-16" : "ml-64"} flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona usuarios y permisos</p>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]" onClick={() => router.push("/admin/users/create")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Usuarios</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <UsersIcon className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Administradores</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.admins}</p>
                                </div>
                                <Shield className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Conductores</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.drivers}</p>
                                </div>
                                <UserCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Con Vehículo</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.withVehicle}</p>
                                </div>
                                <UsersIcon className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o vehículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teléfono
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rol
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehículo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IMEI
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center">
                                                    <span className="text-white font-medium text-sm">
                                                        {u.full_name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()
                                                            .slice(0, 2)}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{u.full_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.phone_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                                                    }`}
                                            >
                                                {u.role === "admin" ? "Administrador" : "Conductor"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {u.vehicle_number || <span className="text-gray-400">No asignado</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {u.imei || <span className="text-gray-400">No asignado</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Button variant="ghost" size="sm">
                                                <Edit className="h-4 w-4 mr-1" />
                                                Editar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
