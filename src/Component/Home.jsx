// src/Component/Home.jsx
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Routes, Route} from "react-router-dom";
import {SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/Component/AppSidebar.jsx";
import Page from "@/Component/Home/Page.jsx";
import DashboardHeader from "@/Component/Home/DashboardHeader.jsx";
import UsersManagement from "@/Component/Main Components/UsersManagement.jsx";

export default function Home() {
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
                            {/* /Home */}
                            <Route index element={<Page/>}/>

                            {/* /Home/regions */}
                            <Route
                                path="regions"
                                element={<Page defaultTab="regions"/>}
                            />

                            {/* /Home/branches */}
                            <Route
                                path="branches"
                                element={<Page defaultTab="branches"/>}
                            />

                            {/* /Home/officers */}
                            <Route
                                path="officers"
                                element={<Page defaultTab="officers"/>}
                            />

                            {/* /Home/groups */}
                            <Route
                                path="groups"
                                element={<Page defaultTab="groups"/>}
                            />

                            {/* /Home/borrowers */}
                            <Route
                                path="borrowers"
                                element={<Page defaultTab="borrowers"/>}
                            />

                            {/* /Home/loans */}
                            <Route
                                path="loans"
                                element={<Page defaultTab="loans"/>}
                            />

                            {/* /Home/users */}
                            <Route path="users" element={<UsersManagement />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
