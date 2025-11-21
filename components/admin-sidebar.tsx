"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Home,
    Route,
    FileText,
    Wrench,
    Truck,
    List,
    PlusCircle,
    Map as MapIcon,
    Cpu,
    Bell,
    Users,
    Server,
    MapPin,
    Activity,
    Settings,
    ChevronDown,
    ChevronRight,
    LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItem {
    id: string
    label: string
    icon: React.ReactNode
    path?: string
    children?: MenuItem[]
}

const menuItems: MenuItem[] = [
    {
        id: "dashboard",
        label: "Panel de control",
        icon: <Home className="h-4 w-4" />,
        path: "/admin",
    },
    {
        id: "trips",
        label: "Viajes",
        icon: <Route className="h-4 w-4" />,
        path: "/admin/trips",
    },
    {
        id: "reports",
        label: "Reportajes",
        icon: <FileText className="h-4 w-4" />,
        path: "/admin/reports",
    },
    {
        id: "maintenance",
        label: "Mantenimientos",
        icon: <Wrench className="h-4 w-4" />,
        children: [
            {
                id: "maintenance-list",
                label: "Lista",
                icon: <List className="h-3 w-3" />,
                path: "/admin/maintenance",
            },
            {
                id: "maintenance-create",
                label: "Crear",
                icon: <PlusCircle className="h-3 w-3" />,
                path: "/admin/maintenance/create",
            },
        ],
    },
    {
        id: "vehicles",
        label: "Vehículos",
        icon: <Truck className="h-4 w-4" />,
        children: [
            {
                id: "vehicles-list",
                label: "Lista",
                icon: <List className="h-3 w-3" />,
                path: "/admin/vehicles",
            },
            {
                id: "vehicles-create",
                label: "Crear",
                icon: <PlusCircle className="h-3 w-3" />,
                path: "/admin/vehicles/create",
            },
            {
                id: "vehicles-map",
                label: "Mapa",
                icon: <MapIcon className="h-3 w-3" />,
                path: "/admin/vehicles/map",
            },
        ],
    },
    {
        id: "devices",
        label: "Dispositivos",
        icon: <Cpu className="h-4 w-4" />,
        path: "/admin/devices",
    },
    {
        id: "alarms",
        label: "Alarmas",
        icon: <Bell className="h-4 w-4" />,
        path: "/admin/alarms",
    },
    {
        id: "users",
        label: "Usuarios",
        icon: <Users className="h-4 w-4" />,
        children: [
            {
                id: "users-list",
                label: "Lista",
                icon: <List className="h-3 w-3" />,
                path: "/admin/users",
            },
            {
                id: "users-create-driver",
                label: "Crear Conductor",
                icon: <PlusCircle className="h-3 w-3" />,
                path: "/admin/drivers/create",
            },
        ],
    },
    {
        id: "servers",
        label: "Servidores",
        icon: <Server className="h-4 w-4" />,
        path: "/admin/servers",
    },
    {
        id: "locations",
        label: "Ubicaciones",
        icon: <MapPin className="h-4 w-4" />,
        path: "/admin/locations",
    },
    {
        id: "monitor",
        label: "Monitor",
        icon: <Activity className="h-4 w-4" />,
        path: "/admin/monitor",
    },
    {
        id: "settings",
        label: "Configuración",
        icon: <Settings className="h-4 w-4" />,
        path: "/admin/settings",
    },
]

interface AdminSidebarProps {
    onLogout: () => void
    userName?: string
}

export function AdminSidebar({ onLogout, userName }: AdminSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [expandedItems, setExpandedItems] = useState<string[]>(["vehicles"])

    const toggleExpand = (itemId: string) => {
        setExpandedItems((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
        )
    }

    const isActive = (path?: string) => {
        if (!path) return false
        return pathname === path
    }

    const isParentActive = (item: MenuItem) => {
        if (item.path && pathname === item.path) return true
        if (item.children) {
            return item.children.some((child) => pathname === child.path)
        }
        return false
    }

    return (
        <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                        <MapPin className="h-7 w-7 text-[#1e3a5f]" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">GPS JF</h1>
                        <p className="text-xs text-white/60">Sistema de Rastreo</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                <ul className="space-y-1">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() => toggleExpand(item.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                            isParentActive(item)
                                                ? "bg-white/10 text-white"
                                                : "text-white/70 hover:bg-white/5 hover:text-white",
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </div>
                                        {expandedItems.includes(item.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                    {expandedItems.includes(item.id) && (
                                        <ul className="mt-1 ml-4 space-y-1">
                                            {item.children.map((child) => (
                                                <li key={child.id}>
                                                    <button
                                                        onClick={() => child.path && router.push(child.path)}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                            isActive(child.path)
                                                                ? "bg-white/10 text-white font-medium"
                                                                : "text-white/60 hover:bg-white/5 hover:text-white/80",
                                                        )}
                                                    >
                                                        {child.icon}
                                                        <span>{child.label}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={() => item.path && router.push(item.path)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive(item.path)
                                            ? "bg-white/10 text-white"
                                            : "text-white/70 hover:bg-white/5 hover:text-white",
                                    )}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-white/10">
                {userName && (
                    <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/50">Usuario</p>
                        <p className="text-sm font-medium text-white truncate">{userName}</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                    onClick={onLogout}
                >
                    <LogOut className="h-4 w-4 mr-3" />
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    )
}
