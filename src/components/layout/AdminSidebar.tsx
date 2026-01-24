
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    SidebarFooter,
} from "@/components/ui/sidebar";
import {
    LayoutDashboard,
    Box,
    Shapes,
    MessageSquareWarning,
    BarChart,
    ShieldCheck,
    ShieldAlert,
    Home,
    Settings,
    Zap,
    Users,
    Globe,
    Activity,
    ListChecks
} from "lucide-react";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";
import { useUser } from "@/firebase";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/products", icon: Box, label: "Products" },
    { href: "/admin/management", icon: ListChecks, label: "Management" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/disputes", icon: MessageSquareWarning, label: "Disputes" },
    { href: "/admin/analytics", icon: BarChart, label: "Analytics" },
];

const integrityItems = [
    { href: "/admin/moderation", icon: ShieldCheck, label: "Moderation" },
    { href: "/admin/fraud-detection", icon: ShieldAlert, label: "Fraud Lab" },
];

const sysItems = [
    { href: "/admin/seo", icon: Globe, label: "SEO" },
    { href: "/admin/system", icon: Activity, label: "System Health" },
    { href: "/admin/settings", icon: Settings, label: "System Settings" },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { user } = useUser();
    const { isSidebarOpen, isHovered } = useSidebar();
    const effectiveOpen = isSidebarOpen || isHovered;

    return (
        <Sidebar>
            <SidebarHeader className="p-6">
                <div className="flex items-center justify-between w-full">
                    {effectiveOpen ? (
                        <Link href="/admin" className="block transform transition-transform hover:scale-105">
                            <Logo className="w-auto h-8" />
                        </Link>
                    ) : (
                        <div className="mx-auto bg-primary/10 p-2 rounded-lg">
                            <Zap className="h-5 w-5 text-primary" />
                        </div>
                    )}
                    {effectiveOpen && <SidebarTrigger />}
                </div>
            </SidebarHeader>

            <SidebarContent className="px-4 py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Return to Marketplace">
                            <Link href="/">
                                <Home />
                                <span>Marketplace</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="my-4 px-4">
                    <div className="h-px bg-border" />
                </div>

                <SidebarMenu className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href}>
                                    <SidebarMenuButton
                                        isActive={isActive}
                                        tooltip={item.label}
                                        className="relative group overflow-hidden"
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                        {isActive && effectiveOpen && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>

                <div className="my-4 px-4">
                    {effectiveOpen && <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2 mb-2">Integrity</div>}
                    <SidebarMenu className="space-y-1">
                        {integrityItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </div>


                <div className="my-4 px-4">
                    {effectiveOpen && <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-2 mb-2">Configuration</div>}
                    <SidebarMenu className="space-y-1">
                        {sysItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </div>
            </SidebarContent>

            <SidebarFooter className={cn("p-6 border-t transition-all", !effectiveOpen && "p-2 px-4")}>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Admin Profile">
                            <Link href="/profile" className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-all", !effectiveOpen && "justify-center gap-0 p-0")}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                    {user?.displayName?.[0] || 'A'}
                                </div>
                                {effectiveOpen && (
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground">{user?.displayName || 'Administrator'}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono tracking-tighter uppercase">Root Access</span>
                                    </div>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
