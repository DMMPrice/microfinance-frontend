import {
    Map,
    Building2,
    BadgeCheck,
    UserCheck,
    UsersRound,
    CreditCard,
    UserCog,
    LayoutDashboard,
    Layers
} from 'lucide-react';
import {NavLink} from '@/Component/NavLink.jsx';
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
} from '@/components/ui/sidebar';
import {useAuth} from '@/contexts/AuthContext.jsx';

const navigationItems = [
    {title: 'Overview', url: '/dashboard', icon: LayoutDashboard},

    {title: 'Regions', url: '/dashboard/regions', icon: Map},

    {title: 'Branches', url: '/dashboard/branches', icon: Building2},

    {title: 'Loan Officers', url: '/dashboard/officers', icon: BadgeCheck},

    {title: 'Groups', url: '/dashboard/groups', icon: Layers},

    {title: 'Borrowers', url: '/dashboard/borrowers', icon: UserCheck},

    {title: 'Loans', url: '/dashboard/loans', icon: CreditCard},

    {title: 'Users Management', url: '/dashboard/users', icon: UserCog},
];

export function AppSidebar() {
    const {state} = useSidebar();
    const {user} = useAuth();
    const collapsed = state === 'collapsed';

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        {!collapsed && 'Management'}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.map((item) => (
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
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {!collapsed && user && (
                    <div className="mt-auto p-4 border-t">
                        <div className="text-sm">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                        </div>
                    </div>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
