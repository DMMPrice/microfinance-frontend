// src/Component/AppSidebar.jsx
import React, {useEffect, useMemo, useState} from "react";
import {
    Map,
    Building2,
    BadgeCheck,
    UserCheck,
    CreditCard,
    UserCog,
    LayoutDashboard,
    Layers,
    ChevronDown,
} from "lucide-react";

import {NavLink} from "@/Utils/NavLink.jsx";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";

import {cn} from "@/lib/utils";
import {useAuth} from "@/contexts/AuthContext.jsx";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {useLocation} from "react-router-dom";

const navigationItems = [
    {title: "Overview", url: "/dashboard", icon: LayoutDashboard},
    {title: "Regions", url: "/dashboard/regions", icon: Map},
    {title: "Branches", url: "/dashboard/branches", icon: Building2},
    {title: "Loan Officers", url: "/dashboard/officers", icon: BadgeCheck},
    {title: "Groups", url: "/dashboard/groups", icon: Layers},
    {title: "Borrowers", url: "/dashboard/borrowers", icon: UserCheck},

    {
        title: "Loans",
        icon: CreditCard,
        children: [
            {title: "Loan Dashboard", url: "/dashboard/loans"},
            {title: "Collection Entry", url: "/dashboard/loans/collection-entry"},
            {title: "Statement Download", url: "/dashboard/loans/statement-download"},
            {title: "Loan View", url: "/dashboard/loans/view"}, // ✅ landing
        ],
    },

    {title: "Users Management", url: "/dashboard/users", icon: UserCog},
];

export function AppSidebar() {
    const {state} = useSidebar();
    const {user} = useAuth();
    const {pathname} = useLocation();
    const collapsed = state === "collapsed";

    const isOnLoansRoute = useMemo(
        () => pathname.startsWith("/dashboard/loans"),
        [pathname]
    );

    const [loansOpen, setLoansOpen] = useState(isOnLoansRoute);

    useEffect(() => {
        setLoansOpen(isOnLoansRoute);
    }, [isOnLoansRoute]);

    useEffect(() => {
        if (collapsed) setLoansOpen(false);
    }, [collapsed]);

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                {/* =================== LOGO HEADER =================== */}
                <div
                    className={cn(
                        "flex items-center gap-3 px-4 py-4 border-b",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <img
                        src="/logo.svg"
                        alt="Akota Society Logo"
                        className={cn("h-8 w-8 object-contain", collapsed && "h-7 w-7")}
                    />

                    {!collapsed && (
                        <div className="leading-tight">
                            <p className="text-sm font-semibold">Akota Society</p>
                            <p className="text-xs text-muted-foreground">
                                Microfinance System
                            </p>
                        </div>
                    )}
                </div>
                {/* =================================================== */}

                <SidebarGroup>
                    <SidebarGroupLabel>{!collapsed && "Management"}</SidebarGroupLabel>

                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.map((item) => {
                                if (!item.children) {
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild tooltip={item.title}>
                                                <NavLink
                                                    to={item.url}
                                                    end={item.url === "/dashboard"}
                                                    className="hover:bg-accent"
                                                    activeClassName="bg-accent text-accent-foreground font-medium"
                                                >
                                                    <item.icon className="h-4 w-4"/>
                                                    <span>{item.title}</span>
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <Collapsible open={loansOpen} onOpenChange={setLoansOpen}>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip={item.title}
                                                    className={cn(
                                                        "justify-between",
                                                        isOnLoansRoute &&
                                                        "bg-accent text-accent-foreground font-medium"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <item.icon className="h-4 w-4"/>
                                                        <span>{item.title}</span>
                                                    </div>

                                                    {!collapsed && (
                                                        <ChevronDown
                                                            className={cn(
                                                                "h-4 w-4 opacity-70 transition-transform duration-200",
                                                                loansOpen ? "rotate-180" : "rotate-0"
                                                            )}
                                                        />
                                                    )}
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <div className={cn("mt-1 pl-6", collapsed && "pl-0")}>
                                                    {item.children.map((child) => {
                                                        // ✅ Loan View should be active for:
                                                        // /dashboard/loans/view
                                                        // /dashboard/loans/view/:loan_id
                                                        const isLoanViewRoute =
                                                            child.url === "/dashboard/loans/view" &&
                                                            pathname.startsWith("/dashboard/loans/view");

                                                        return (
                                                            <div key={child.title} className="py-0.5">
                                                                <NavLink
                                                                    to={child.url}
                                                                    end={child.url !== "/dashboard/loans/view"} // ✅ landing is NOT exact-only
                                                                    className={cn(
                                                                        "block rounded-md px-2 py-1 text-sm hover:bg-accent",
                                                                        collapsed && "hidden",
                                                                        isLoanViewRoute &&
                                                                        "bg-accent text-accent-foreground font-medium"
                                                                    )}
                                                                    activeClassName="bg-accent text-accent-foreground font-medium"
                                                                >
                                                                    {child.title}
                                                                </NavLink>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {!collapsed && user && (
                    <div className="mt-auto p-4 border-t">
                        <div className="text-sm">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {user.role}
                            </p>
                        </div>
                    </div>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
