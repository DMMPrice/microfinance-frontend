import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/button";
import {LogOut} from "lucide-react";
import {useNavigate} from "react-router-dom";

export default function DashboardHeader({hideInSidebar = false}) {
    const {user, logout} = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    if (hideInSidebar) {
        return (
            <div className="flex items-center justify-between w-full">
                <div>
                    <h2 className="text-lg font-semibold">Micro Finance</h2>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    Logout
                </Button>
            </div>
        );
    }

    return (
        <header className="border-b bg-card">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{user?.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">
                        {user?.role}
                    </p>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4"/>
                    Logout
                </Button>
            </div>
        </header>
    );
}
