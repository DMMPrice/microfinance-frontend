import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Dashboard for {user.role} coming soon...</div>;
  }
}
