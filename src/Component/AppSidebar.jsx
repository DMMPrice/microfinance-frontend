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
import logo from "@/assets/logo.svg";

/* -------------------- Roles -------------------- */
import {
    ROLES,
    ROLE_LABEL,
    hasRole,
    normalizeRole,
} from "@/config/roles";

/* -------------------- Navigation Config -------------------- */
const navigationItems = [
    // ✅ only admin + super_admin
    {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },

    // ✅ only admin + super_admin
    {
        title: "Regions",
        url: "/dashboard/regions",
        icon: Map,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },

    // ✅ admin, super_admin, regional_manager, branch_manager (NO loan_officer)
    {
        title: "Branches",
        url: "/dashboard/branches",
        icon: Building2,
        allowedRoles: [
            ROLES.ADMIN,
            ROLES.SUPER_ADMIN,
            ROLES.REGIONAL_MANAGER,
            ROLES.BRANCH_MANAGER,
        ],
    },

    // ✅ admin, super_admin, regional_manager, branch_manager (NO loan_officer)
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

    // ❌ Loan Officer cannot see Groups
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

    // ✅ Loan Officer CAN see Borrowers
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

    // ✅ Loan Officer CAN see Loans
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
                title: "Statement Download",
                url: "/dashboard/loans/statement-download",
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

    // ✅ only admin + super_admin
    {
        title: "Users Management",
        url: "/dashboard/users",
        icon: UserCog,
        allowedRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },
];

export function AppSidebar() {
    const {state} = useSidebar();

    // ✅ get profile also (stored from /auth/me)
    const {user, profile} = useAuth();

    const {pathname} = useLocation();
    const collapsed = state === "collapsed";

    /* -------------------- Role (Source of Truth = profileData) -------------------- */
    const role = normalizeRole(profile?.role || user?.role);

    const canSee = (item) => {
        if (!item?.allowedRoles) return true;
        if (!role) return false;
        return hasRole(role, item.allowedRoles);
    };

    /* -------------------- Loans Collapsible -------------------- */
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

                                    // ----------- Parent (Loans) -----------
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
                                                        {item.children
                                                            .filter(canSee)
                                                            .map((child) => {
                                                                const isLoanViewRoute =
                                                                    child.url === "/dashboard/loans/view" &&
                                                                    pathname.startsWith("/dashboard/loans/view");

                                                                return (
                                                                    <div key={child.title} className="py-0.5">
                                                                        <NavLink
                                                                            to={child.url}
                                                                            end={child.url !== "/dashboard/loans/view"}
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
