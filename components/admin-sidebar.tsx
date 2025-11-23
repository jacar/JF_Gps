"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    PanelLeft,
    PanelRight,
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
    X,
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
    onClose?: () => void
    isCollapsed?: boolean
    onToggleCollapse?: () => void
}

export function AdminSidebar({ onLogout, userName, onClose, isCollapsed: controlledIsCollapsed, onToggleCollapse: controlledOnToggleCollapse }: AdminSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [expandedItems, setExpandedItems] = useState<string[]>(["vehicles"])
    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)

    const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed
    const onToggleCollapse = controlledOnToggleCollapse ?? (() => setInternalIsCollapsed(prev => !prev))

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
        <aside
            className={`bg-red-900 text-white flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-200 ease-in-out ${isCollapsed ? "w-16" : "w-64"}`}
        >
            {/* Logo */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between relative">
                {!isCollapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img src="/logoadmin.png" alt="Logo RASTREA MÓVIL" className="h-16 w-16" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">RASTREA MÓVIL</h1>
                            <p className="text-xs text-red-300">Sistema de Rastreo Vehicular</p>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="flex items-center justify-center w-full">
                        <img src="/logoadmin.png" alt="Logo RASTREA MÓVIL" className="h-10 w-10" />
                    </div>
                )}






                {onClose && !isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-red-800 text-white hover:bg-red-700 md:hidden"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
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
                                                ? "bg-red-700 text-white"
                                                : "hover:bg-red-800",
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            {!isCollapsed && <span>{item.label}</span>}
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
                                                        onClick={() => {
                                                            child.path && router.push(child.path);
                                                            onClose?.();
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                            isActive(child.path)
                                                                ? "bg-red-700 text-white font-medium"
                                                                : "hover:bg-red-800",
                                                        )}
                                                    >
                                                        {child.icon}
                                                        {!isCollapsed && <span>{child.label}</span>}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (item.id === "dashboard") { onToggleCollapse(); }
                                        item.path && router.push(item.path);
                                        onClose?.();
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive(item.path)
                                            ? "bg-red-700 text-white"
                                            : "hover:bg-red-800",
                                    )}
                                >
                                    {item.icon}
                                    {!isCollapsed && <span>{item.label}</span>}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-white/10">
                {!isCollapsed && userName && (
                    <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/50">Usuario</p>
                        <p className="text-sm font-medium text-white truncate">{userName}</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className={`w-full justify-start bg-red-800 text-white hover:bg-red-700 ${isCollapsed ? "px-2" : ""}`}
                    onClick={onLogout}
                >
                    <LogOut className="h-4 w-4 mr-3" />
                    {!isCollapsed && "Cerrar Sesión"}
                </Button>
            </div>
        </aside>
    )
}
