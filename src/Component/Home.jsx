// src/Component/Home.jsx
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Routes, Route, Navigate, useLocation, matchPath} from "react-router-dom";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/Component/AppSidebar.jsx";
import DashboardHeader from "@/Utils/DashboardHeader.jsx";

// Pages
import OverviewPage from "@/pages/OverviewPage.jsx";
import RegionsPage from "@/Component/Regions/Page.jsx";
import BranchesPage from "@/Component/Branch/Page.jsx";
import LoanOfficerPage from "@/Component/Loan Officer/Page.jsx";
import GroupsPage from "@/Component/Groups/Page.jsx";
import MembersPage from "@/Component/Members/Page.jsx";
import UsersPage from "@/Pages/UsersPage.jsx";

// ✅ Loans pages
import LoansPage from "@/Component/Loan/LoansPage.jsx";
import CollectionEntryPage from "@/Component/Loan/CollectionEntryPage.jsx";
import StatementDownloadPage from "@/Component/Loan/StatementDownloadPage.jsx";
import LoanViewPage from "@/Component/Loan/LoanViewPage.jsx";

// ✅ NEW: Loan view landing page
import LoanViewLandingPage from "@/Component/Loan/LoanViewLandingPage.jsx";

// ✅ Route meta for dynamic header + breadcrumbs
const ROUTE_META = [
    {
        pattern: "/dashboard",
        title: "Dashboard",
        subtitle: "Overview",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Dashboard"},
        ],
    },
    {
        pattern: "/dashboard/regions",
        title: "Regions",
        subtitle: "Create and manage regions",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Regions"},
        ],
    },
    {
        pattern: "/dashboard/branches",
        title: "Branches",
        subtitle: "Create and manage branches",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Branches"},
        ],
    },
    {
        pattern: "/dashboard/officers",
        title: "Loan Officers",
        subtitle: "Create and manage loan officers",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loan Officers"},
        ],
    },
    {
        pattern: "/dashboard/groups",
        title: "Groups",
        subtitle: "Create and manage groups",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Groups"},
        ],
    },
    {
        pattern: "/dashboard/borrowers",
        title: "Members",
        subtitle: "Create and manage Members",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Members"},
        ],
    },
    {
        pattern: "/dashboard/users",
        title: "Users Management",
        subtitle: "Manage system users",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Users Management"},
        ],
    },

    // Loans
    {
        pattern: "/dashboard/loans",
        title: "Loans",
        subtitle: "Loan dashboard",
        breadcrumbs: [
            {label: "Home", to: "/dashboard"},
            {label: "Loans"},
        ],
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
];

function getRouteMeta(pathname) {
    // exact matches first
    let found = ROUTE_META.find((r) => matchPath({path: r.pattern, end: true}, pathname));

    // fallback to partial matches
    if (!found) {
        found = ROUTE_META.find((r) => matchPath({path: r.pattern, end: false}, pathname));
    }

    return (
        found || {
            title: "Dashboard",
            subtitle: "",
            breadcrumbs: [{label: "Home", to: "/dashboard"}, {label: "Dashboard"}],
        }
    );
}

export default function Home() {
    const {user} = useAuth();
    const {pathname} = useLocation();

    const {title, subtitle, breadcrumbs} = getRouteMeta(pathname);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Session not found. Please log in again.</p>
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
                            <Route path="/" element={<OverviewPage/>}/>

                            <Route path="regions" element={<RegionsPage/>}/>
                            <Route path="branches" element={<BranchesPage/>}/>
                            <Route path="officers" element={<LoanOfficerPage/>}/>
                            <Route path="groups" element={<GroupsPage/>}/>
                            <Route path="borrowers" element={<MembersPage/>}/>

                            <Route path="loans" element={<LoansPage/>}/>
                            <Route path="loans/collection-entry" element={<CollectionEntryPage/>}/>
                            <Route path="loans/statement-download" element={<StatementDownloadPage/>}/>
                            <Route path="loans/view" element={<LoanViewLandingPage/>}/>
                            <Route path="loans/view/:loan_id" element={<LoanViewPage/>}/>

                            <Route path="users" element={<UsersPage/>}/>

                            <Route path="*" element={<Navigate to="." replace/>}/>
                        </Routes>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
