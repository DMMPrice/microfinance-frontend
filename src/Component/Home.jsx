// src/Component/Home.jsx
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Routes, Route, Navigate, useLocation, matchPath} from "react-router-dom";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/Component/AppSidebar.jsx";
import DashboardHeader from "@/Utils/DashboardHeader.jsx";

// Roles
import {ROLES, normalizeRole} from "@/config/roles";

// Pages
import OverviewPage from "@/pages/OverviewPage.jsx";
import RegionsPage from "@/Component/Regions/Page.jsx";
import BranchesPage from "@/Component/Branch/Home/Page.jsx";
import LoanOfficerPage from "@/Component/Loan Officer/Page.jsx";
import GroupsPage from "@/Component/Groups/Page.jsx";
import MembersPage from "@/Component/Members/Page.jsx";
import Page from "@/Component/User Management/Page.jsx";
import BranchExpensesPage from "@/Component/Branch/Expenses/Page.jsx";
import LoansPage from "@/Component/Loan/Loan Dashboard/LoansPage.jsx";
import CollectionEntryPage from "@/Component/Loan/Collection Entry/CollectionEntryPage.jsx";
import LoanViewPage from "@/Component/Loan/Loan View/LoanViewPage.jsx";
import LoanViewLandingPage from "@/Component/Loan/Loan View/LoanViewLandingPage.jsx";
import SettingPage from "@/Component/Settings/Page.jsx";

// ✅ NEW: Reports Pages (create placeholders now)
import BranchReportsPage from "@/Component/Reports/Branch/Page.jsx";
import GroupReportsPage from "@/Component/Reports/Group/Page.jsx";

/* -------------------- Route meta for header -------------------- */
const ROUTE_META = [
    {
        pattern: "/dashboard",
        title: "Dashboard",
        subtitle: "Overview",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Dashboard"}],
    },
    {
        pattern: "/dashboard/regions",
        title: "Regions",
        subtitle: "Create and manage regions",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Regions"}],
    },
    {
        pattern: "/dashboard/branches",
        title: "Branches",
        subtitle: "Create and manage branches",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Branches"}],
    },

    // ✅ Branch Expenses header meta
    {
        pattern: "/dashboard/branches/expenses",
        title: "Branch Expenses",
        subtitle: "Track and manage branch expenses",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Branches", to: "/dashboard/branches"},
            {label: "Expenses"},
        ],
    },

    {
        pattern: "/dashboard/officers",
        title: "Loan Officers",
        subtitle: "Create and manage loan officers",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Loan Officers"}],
    },
    {
        pattern: "/dashboard/groups",
        title: "Groups",
        subtitle: "Create and manage groups",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Groups"}],
    },
    {
        pattern: "/dashboard/borrowers",
        title: "Borrowers",
        subtitle: "Create and manage borrowers",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Borrowers"}],
    },
    {
        pattern: "/dashboard/users",
        title: "Users Management",
        subtitle: "Manage system users",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Users Management"}],
    },
    {
        pattern: "/dashboard/loans",
        title: "Loans",
        subtitle: "Loan dashboard",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Loans"}],
    },
    {
        pattern: "/dashboard/loans/collection-entry",
        title: "Collection Entry",
        subtitle: "Record repayments",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loans", to: "/dashboard/loans"},
            {label: "Collection Entry"},
        ],
    },
    {
        pattern: "/dashboard/loans/statement-download",
        title: "Statement Download",
        subtitle: "Download loan statements",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loans", to: "/dashboard/loans"},
            {label: "Statement Download"},
        ],
    },
    {
        pattern: "/dashboard/loans/view",
        title: "Loan View",
        subtitle: "Search and open a loan",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loans", to: "/dashboard/loans"},
            {label: "Loan View"},
        ],
    },
    {
        pattern: "/dashboard/loans/view/:loan_id",
        title: "Loan View",
        subtitle: "Loan details",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loans", to: "/dashboard/loans"},
            {label: "Loan View", to: "/dashboard/loans/view"},
            {label: "Details"},
        ],
    },

    // ✅ NEW: Reports header meta
    {
        pattern: "/dashboard/reports/branches",
        title: "Branch Reports",
        subtitle: "Branch-wise reporting & exports",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Reports"},
            {label: "Branch Reports"},
        ],
    },
    {
        pattern: "/dashboard/reports/groups",
        title: "Group Reports",
        subtitle: "Group-wise reporting & exports",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Reports"},
            {label: "Group Reports"},
        ],
    },

    {
        pattern: "/dashboard/settings",
        title: "System Settings",
        subtitle: "Manage system settings",
        breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "System Settings"}],
    },
];

function getRouteMeta(pathname) {
    let found = ROUTE_META.find((r) => matchPath({path: r.pattern, end: true}, pathname));
    if (!found) found = ROUTE_META.find((r) => matchPath({path: r.pattern, end: false}, pathname));

    return (
        found || {
            title: "Dashboard",
            subtitle: "",
            breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Dashboard"}],
        }
    );
}

/* -------------------- RBAC helpers -------------------- */
const ADMIN_DASH_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

const BRANCH_MGMT_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_MANAGER,
    ROLES.BRANCH_MANAGER,
];

const USERS_MGMT_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

const ALL_BUSINESS_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_MANAGER,
    ROLES.BRANCH_MANAGER,
    ROLES.LOAN_OFFICER,
];

// ✅ Everyone EXCEPT loan_officer (for Groups)
const NON_LOAN_OFFICER_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_MANAGER,
    ROLES.BRANCH_MANAGER,
];

const SYSTEM_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// ✅ NEW: Reports roles (same as Branch Mgmt for now)
const REPORTS_ROLES = BRANCH_MGMT_ROLES;

function Guard({allowedRoles, role, children}) {
    if (!role) return <Navigate to="/login" replace/>;
    if (!allowedRoles || allowedRoles.length === 0) return children;

    const ok = allowedRoles.includes(role);
    if (!ok) return <Navigate to="/dashboard/loans" replace/>;

    return children;
}

export default function Home() {
    const {user, profile} = useAuth();
    const {pathname} = useLocation();

    // ✅ authoritative role from profileData
    const role = normalizeRole(profile?.role || user?.role);

    const {title, subtitle, breadcrumbs} = getRouteMeta(pathname);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Session not found. Please log in again.</p>
            </div>
        );
    }

    // ✅ Prevent flicker/blank when profile loads
    if (!role) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar/>

                <div className="flex-1 flex flex-col">
                    <div className="sticky top-0 z-10 bg-background">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger/>
                            <div className="flex-1">
                                <DashboardHeader
                                    variant="top"
                                    title={title}
                                    subtitle={subtitle}
                                    breadcrumbs={breadcrumbs}
                                />
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 p-4">
                        <Routes>
                            {/* ✅ FIX: index route (NO redirect loop) */}
                            <Route
                                index
                                element={
                                    ADMIN_DASH_ROLES.includes(role) ? (
                                        <OverviewPage/>
                                    ) : (
                                        <Navigate to="loans" replace/>
                                    )
                                }
                            />

                            {/* Admin-only */}
                            <Route
                                path="regions"
                                element={
                                    <Guard role={role} allowedRoles={ADMIN_DASH_ROLES}>
                                        <RegionsPage/>
                                    </Guard>
                                }
                            />

                            {/* Branch mgmt */}
                            <Route
                                path="branches/home"
                                element={
                                    <Guard role={role} allowedRoles={BRANCH_MGMT_ROLES}>
                                        <BranchesPage/>
                                    </Guard>
                                }
                            />

                            {/* Branch Expenses */}
                            <Route
                                path="branches/expenses"
                                element={
                                    <Guard role={role} allowedRoles={BRANCH_MGMT_ROLES}>
                                        <BranchExpensesPage/>
                                    </Guard>
                                }
                            />

                            {/* Loan officers mgmt */}
                            <Route
                                path="officers"
                                element={
                                    <Guard role={role} allowedRoles={BRANCH_MGMT_ROLES}>
                                        <LoanOfficerPage/>
                                    </Guard>
                                }
                            />

                            {/* Groups: NOT allowed for loan_officer */}
                            <Route
                                path="groups"
                                element={
                                    <Guard role={role} allowedRoles={NON_LOAN_OFFICER_ROLES}>
                                        <GroupsPage/>
                                    </Guard>
                                }
                            />

                            {/* Borrowers */}
                            <Route
                                path="borrowers"
                                element={
                                    <Guard role={role} allowedRoles={ALL_BUSINESS_ROLES}>
                                        <MembersPage/>
                                    </Guard>
                                }
                            />

                            {/* Loans */}
                            <Route
                                path="loans"
                                element={
                                    <Guard role={role} allowedRoles={ALL_BUSINESS_ROLES}>
                                        <LoansPage/>
                                    </Guard>
                                }
                            />
                            <Route
                                path="loans/collection-entry"
                                element={
                                    <Guard role={role} allowedRoles={ALL_BUSINESS_ROLES}>
                                        <CollectionEntryPage/>
                                    </Guard>
                                }
                            />
                            <Route
                                path="loans/view"
                                element={
                                    <Guard role={role} allowedRoles={ALL_BUSINESS_ROLES}>
                                        <LoanViewLandingPage/>
                                    </Guard>
                                }
                            />
                            <Route
                                path="loans/view/:loan_id"
                                element={
                                    <Guard role={role} allowedRoles={ALL_BUSINESS_ROLES}>
                                        <LoanViewPage/>
                                    </Guard>
                                }
                            />

                            {/* ✅ NEW: Reports routes */}
                            <Route
                                path="reports/branches"
                                element={
                                    <Guard role={role} allowedRoles={REPORTS_ROLES}>
                                        <BranchReportsPage/>
                                    </Guard>
                                }
                            />
                            <Route
                                path="reports/groups"
                                element={
                                    <Guard role={role} allowedRoles={REPORTS_ROLES}>
                                        <GroupReportsPage/>
                                    </Guard>
                                }
                            />

                            {/* Users: admin only */}
                            <Route
                                path="users"
                                element={
                                    <Guard role={role} allowedRoles={USERS_MGMT_ROLES}>
                                        <Page/>
                                    </Guard>
                                }
                            />

                            {/* System Settings */}
                            <Route
                                path="settings"
                                element={
                                    <Guard role={role} allowedRoles={SYSTEM_ROLES}>
                                        <SettingPage/>
                                    </Guard>
                                }
                            />

                            {/* Catch-all */}
                            <Route path="*" element={<Navigate to="." replace/>}/>
                        </Routes>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
