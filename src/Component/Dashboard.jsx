// src/Component/Dashboard.jsx
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Routes, Route} from "react-router-dom";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/Component/AppSidebar.jsx";
import AdminDashboard from "@/Component/dashboard/AdminDashboard.jsx";
import DashboardHeader from "@/Component/dashboard/DashboardHeader.jsx";

export default function Dashboard() {
    const {user} = useAuth();

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">
                    Session not found. Please log in again.
                </p>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar/>
                <div className="flex-1 flex flex-col">
                    {/* Sticky header */}
                    <div className="border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center gap-2 p-4">
                            <SidebarTrigger/>
                            <div className="flex-1">
                                <DashboardHeader hideInSidebar/>
                            </div>
                        </div>
                    </div>

                    {/* Main content area with nested routes */}
                    <main className="flex-1">
                        <Routes>
                            {/* /dashboard */}
                            <Route index element={<AdminDashboard/>}/>

                            {/* /dashboard/regions */}
                            <Route
                                path="regions"
                                element={<AdminDashboard defaultTab="regions"/>}
                            />

                            {/* /dashboard/branches */}
                            <Route
                                path="branches"
                                element={<AdminDashboard defaultTab="branches"/>}
                            />

                            {/* /dashboard/officers */}
                            <Route
                                path="officers"
                                element={<AdminDashboard defaultTab="officers"/>}
                            />

                            {/* /dashboard/groups */}
                            <Route
                                path="groups"
                                element={<AdminDashboard defaultTab="groups"/>}
                            />

                            {/* /dashboard/borrowers */}
                            <Route
                                path="borrowers"
                                element={<AdminDashboard defaultTab="borrowers"/>}
                            />

                            {/* /dashboard/loans */}
                            <Route
                                path="loans"
                                element={<AdminDashboard defaultTab="loans"/>}
                            />
                        </Routes>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
