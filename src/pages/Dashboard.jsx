import { useAuth } from '@/contexts/AuthContext';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2 p-4">
              <SidebarTrigger />
              <div className="flex-1">
                <DashboardHeader hideInSidebar />
              </div>
            </div>
          </div>
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/regions" element={<AdminDashboard defaultTab="regions" />} />
              <Route path="/branches" element={<AdminDashboard defaultTab="branches" />} />
              <Route path="/officers" element={<AdminDashboard defaultTab="officers" />} />
              <Route path="/groups" element={<AdminDashboard defaultTab="groups" />} />
              <Route path="/borrowers" element={<AdminDashboard defaultTab="borrowers" />} />
              <Route path="/loans" element={<AdminDashboard defaultTab="loans" />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
