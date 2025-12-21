// src/Component/Home.jsx
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Routes, Route, Navigate} from "react-router-dom";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/Component/AppSidebar.jsx";
import DashboardHeader from "@/Component/Home/DashboardHeader.jsx";

// Pages
import OverviewPage from "@/pages/OverviewPage.jsx";
import RegionsPage from "@/pages/RegionsPage.jsx";
import BranchesPage from "@/pages/BranchesPage.jsx";
import LoanOfficersPage from "@/pages/LoanOfficersPage.jsx";
import GroupsPage from "@/pages/GroupsPage.jsx";
import BorrowersPage from "@/pages/BorrowersPage.jsx";
import UsersPage from "@/Pages/UsersPage.jsx";

// ✅ Loans pages
import LoansPage from "@/pages/LoansPage.jsx";
import CollectionEntryPage from "@/pages/CollectionEntryPage.jsx";
import StatementDownloadPage from "@/pages/StatementDownloadPage.jsx";
import LoanViewPage from "@/Pages/LoanViewPage.jsx";

// ✅ NEW: Loan view landing page
import LoanViewLandingPage from "@/Pages/LoanViewLandingPage.jsx";

export default function Home() {
    const {user} = useAuth();

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
                    <div className="border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center gap-2 p-4">
                            <SidebarTrigger/>
                            <div className="flex-1">
                                <DashboardHeader hideInSidebar/>
                            </div>
                        </div>
                    </div>

                    <main className="flex-1 p-4">
                        <Routes>
                            <Route index element={<OverviewPage/>}/>

                            <Route path="regions" element={<RegionsPage/>}/>
                            <Route path="branches" element={<BranchesPage/>}/>
                            <Route path="officers" element={<LoanOfficersPage/>}/>
                            <Route path="groups" element={<GroupsPage/>}/>
                            <Route path="borrowers" element={<BorrowersPage/>}/>

                            {/* ✅ Loans */}
                            <Route path="loans" element={<LoansPage/>}/>
                            <Route path="loans/collection-entry" element={<CollectionEntryPage/>}/>
                            <Route path="loans/statement-download" element={<StatementDownloadPage/>}/>

                            {/* ✅ FIX: add landing + dynamic view */}
                            <Route path="loans/view" element={<LoanViewLandingPage/>}/>
                            <Route path="loans/view/:loan_id" element={<LoanViewPage/>}/>

                            <Route path="users" element={<UsersPage/>}/>

                            <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
                        </Routes>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
