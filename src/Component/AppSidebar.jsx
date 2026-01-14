// src/Component/AppSidebar.jsx
import React, {useEffect, useState} from "react";
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
    Settings,
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
import {useLocation, matchPath} from "react-router-dom";
import logo from "@/assets/logo.svg";
import {ROLES, ROLE_LABEL, hasRole, normalizeRole} from "@/config/roles";

/* -------------------- Navigation Config -------------------- */
const navigationItems = [
    {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },
    {
        title: "Regions",
        url: "/dashboard/regions",
        icon: Map,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },

    // ✅ Branches (with submenu)
    {
        title: "Branches",
        icon: Building2,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
        ],
        children: [
            {
                title: "Branch List",
                url: "/dashboard/branches/home",
                allowedRoles: [
                    ROLES.ADMIN,
                    ROLES.SUPER_ADMIN,
                    ROLES.REGIONAL_MANAGER,
                ],
            },
            {
                title: "Expenses",
                url: "/dashboard/branches/expenses",
                allowedRoles: [
                    ROLES.ADMIN,
                    ROLES.SUPER_ADMIN,
                    ROLES.REGIONAL_MANAGER,
                    ROLES.BRANCH_MANAGER,
                ],
            },
        ],
    },

    {
        title: "Loan Officers",
        url: "/dashboard/officers",
        icon: BadgeCheck,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
        ],
    },

    {
        title: "Groups",
        url: "/dashboard/groups",
        icon: Layers,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
        ],
    },

    {
        title: "Borrowers",
        url: "/dashboard/borrowers",
        icon: UserCheck,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
            ROLES.LOAN_OFFICER,
        ],
    },

    // ✅ Loans (with submenu)
    {
        title: "Loans",
        icon: CreditCard,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
            ROLES.LOAN_OFFICER,
        ],
        children: [
            {
                title: "Loan Dashboard",
                url: "/dashboard/loans",
                allowedRoles: [
                    ROLES.ADMIN,
                    ROLES.SUPER_ADMIN,
                    ROLES.REGIONAL_MANAGER,
                    ROLES.BRANCH_MANAGER,
                    ROLES.LOAN_OFFICER,
                ],
            },
            {
                title: "Collection Entry",
                url: "/dashboard/loans/collection-entry",
                allowedRoles: [
                    ROLES.ADMIN,
                    ROLES.SUPER_ADMIN,
                    ROLES.REGIONAL_MANAGER,
                    ROLES.BRANCH_MANAGER,
                    ROLES.LOAN_OFFICER,
                ],
            },
            {
                title: "Loan View",
                url: "/dashboard/loans/view",
                allowedRoles: [
                    ROLES.ADMIN,
                    ROLES.SUPER_ADMIN,
                    ROLES.REGIONAL_MANAGER,
                    ROLES.BRANCH_MANAGER,
                    ROLES.LOAN_OFFICER,
                ],
            },
        ],
    },

    {
        title: "Users Management",
        url: "/dashboard/users",
        icon: UserCog,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },
    {
        title: "System Settings",
        url: "/dashboard/settings",
        icon: Settings,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },
];

export function AppSidebar() {
    const {state} = useSidebar();
    const {user, profile} = useAuth();
    const {pathname} = useLocation();
    const collapsed = state === "collapsed";

    /* -------------------- Role -------------------- */
    const role = normalizeRole(profile?.role || user?.role);

    const canSee = (item) => {
        if (!item?.allowedRoles) return true;
        if (!role) return false;
        return hasRole(role, item.allowedRoles);
    };

    /* -------------------- Active helpers -------------------- */
    const isChildActive = (child) => {
        // Only Loan View stays active for /dashboard/loans/view/:loan_id
        const end = child.url !== "/dashboard/loans/view";
        return !!matchPath({path: child.url, end}, pathname);
    };

    const isOnParentRoute = (parentItem) => {
        if (!parentItem?.children?.length) return false;
        return parentItem.children.some((c) => isChildActive(c));
    };

    /* -------------------- Open state for all parents -------------------- */
    const [openMap, setOpenMap] = useState(() => {
        const initial = {};
        navigationItems.forEach((item) => {
            if (item.children?.length) {
                initial[item.title] = isOnParentRoute(item);
            }
        });
        return initial;
    });

    // ✅ keep correct submenu opened when route changes
    useEffect(() => {
        setOpenMap((prev) => {
            const next = {...prev};
            navigationItems.forEach((item) => {
                if (item.children?.length) {
                    next[item.title] = isOnParentRoute(item);
                }
            });
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // ✅ collapse sidebar => close all submenus
    useEffect(() => {
        if (collapsed) {
            setOpenMap((prev) => {
                const next = {...prev};
                Object.keys(next).forEach((k) => (next[k] = false));
                return next;
            });
        }
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
                        src={logo}
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
                            {navigationItems
                                .filter(canSee)
                                .map((item) => {
                                    // ----------- Single Item -----------
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

                                    // ----------- Parent Item (Branches / Loans) -----------
                                    const parentOpen = !!openMap[item.title];
                                    const parentActive = isOnParentRoute(item);

                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <Collapsible
                                                open={parentOpen}
                                                onOpenChange={(v) =>
                                                    setOpenMap((prev) => ({...prev, [item.title]: v}))
                                                }
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={item.title}
                                                        className={cn(
                                                            "justify-between",
                                                            parentActive &&
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
                                                                    parentOpen ? "rotate-180" : "rotate-0"
                                                                )}
                                                            />
                                                        )}
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>

                                                <CollapsibleContent>
                                                    <div className={cn("mt-1 pl-6", collapsed && "pl-0")}>
                                                        {item.children
                                                            .filter(canSee)
                                                            .map((child) => {
                                                                const active = isChildActive(child);

                                                                return (
                                                                    <div key={child.title} className="py-0.5">
                                                                        <NavLink
                                                                            to={child.url}
                                                                            // ✅ exact for all, except loan view should stay active for /view/:loan_id
                                                                            end={child.url !== "/dashboard/loans/view"}
                                                                            className={cn(
                                                                                "block rounded-md px-2 py-1 text-sm hover:bg-accent",
                                                                                collapsed && "hidden",
                                                                                active &&
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

                {/* =================== USER FOOTER =================== */}
                {!collapsed && (user || profile) && (
                    <div className="mt-auto p-4 border-t">
                        <div className="text-sm">
                            <p className="font-medium">{user?.username || "-"}</p>
                            <p className="text-xs text-muted-foreground">
                                {ROLE_LABEL[role] || role || "-"}
                            </p>
                        </div>
                    </div>
                )}
                {/* =================================================== */}
            </SidebarContent>
        </Sidebar>
    );
}
