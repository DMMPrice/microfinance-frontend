// src/Utils/DashboardHeader.jsx
import {useMemo, useState} from "react";
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Button} from "@/components/ui/button.tsx";
import {LogOut, ChevronRight, User} from "lucide-react";
import {Link, useNavigate} from "react-router-dom";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";
import ProfileModal from "@/Utils/ProfileModal.jsx";

/**
 * DashboardHeader (Breadcrumb + Dynamic)
 *
 * Props:
 * - variant: "top" | "sidebar"
 * - title?: string
 * - subtitle?: string
 * - breadcrumbs?: Array<{ label: string, to?: string }>
 * - rightContent?: ReactNode
 * - showLogout?: boolean
 */
export default function DashboardHeader({
                                            variant = "top",
                                            title,
                                            subtitle,
                                            breadcrumbs = null,
                                            rightContent = null,
                                            showLogout = true,
                                        }) {
    const {user, logout} = useAuth();
    const navigate = useNavigate();

    const [logoutOpen, setLogoutOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const computedTitle = useMemo(() => {
        if (title) return title;
        if (variant === "sidebar") return "Micro Finance";
        return user?.name || "Dashboard";
    }, [title, user?.name, variant]);

    const computedSubtitle = useMemo(() => {
        if (subtitle !== undefined) return subtitle; // allow empty string intentionally
        if (variant === "sidebar") return "";
        return user?.role ? String(user.role) : "";
    }, [subtitle, user?.role, variant]);

    const handleLogoutConfirm = () => {
        logout();
        setLogoutOpen(false);
        navigate("/login");
    };

    /* ---------------- Buttons ---------------- */

    const ProfileBtn = (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileOpen(true)}
        >
            <User className="mr-2 h-4 w-4"/>
            Profile
        </Button>
    );

    const LogoutBtn = showLogout ? (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setLogoutOpen(true)}
        >
            <LogOut className="mr-2 h-4 w-4"/>
            Logout
        </Button>
    ) : null;

    const RightArea = (
        <div className="flex items-center gap-2">
            {rightContent}
            {ProfileBtn}
            {LogoutBtn}
        </div>
    );

    /* ---------------- Breadcrumb ---------------- */

    const BreadcrumbBar = breadcrumbs?.length ? (
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((b, idx) => {
                const last = idx === breadcrumbs.length - 1;

                const node =
                    b.to && !last ? (
                        <Link
                            to={b.to}
                            className="hover:text-foreground transition-colors"
                        >
                            {b.label}
                        </Link>
                    ) : (
                        <span className={last ? "text-foreground font-medium" : ""}>
                            {b.label}
                        </span>
                    );

                return (
                    <div key={`${b.label}-${idx}`} className="flex items-center gap-2">
                        {idx !== 0 && (
                            <ChevronRight className="h-4 w-4 opacity-60"/>
                        )}
                        {node}
                    </div>
                );
            })}
        </nav>
    ) : null;

    /* ---------------- Sidebar Variant ---------------- */

    if (variant === "sidebar") {
        return (
            <>
                <div className="flex items-center justify-between w-full">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">
                            {computedTitle}
                        </h2>
                        {computedSubtitle ? (
                            <p className="text-xs text-muted-foreground truncate">
                                {computedSubtitle}
                            </p>
                        ) : null}
                    </div>
                    {RightArea}
                </div>

                {/* Logout confirmation */}
                <ConfirmDialog
                    open={logoutOpen}
                    onOpenChange={setLogoutOpen}
                    title="Logout confirmation"
                    description="Are you sure you want to logout?"
                    confirmLabel="Logout"
                    cancelLabel="Cancel"
                    onConfirm={handleLogoutConfirm}
                />

                {/* Profile modal */}
                <ProfileModal
                    open={profileOpen}
                    onOpenChange={setProfileOpen}
                />
            </>
        );
    }

    /* ---------------- Top Variant ---------------- */

    return (
        <>
            <header className="border-b border-border/50 bg-card">
                <div className="w-full px-6 py-2 flex items-center justify-between">
                    <div className="min-w-0">
                        {BreadcrumbBar ? (
                            BreadcrumbBar
                        ) : (
                            <>
                                <h2 className="text-base font-semibold truncate">
                                    {computedTitle}
                                </h2>
                                {computedSubtitle ? (
                                    <p className="text-xs text-muted-foreground capitalize truncate">
                                        {computedSubtitle}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </div>

                    {RightArea}
                </div>
            </header>

            {/* Logout confirmation */}
            <ConfirmDialog
                open={logoutOpen}
                onOpenChange={setLogoutOpen}
                title="Logout confirmation"
                description="Are you sure you want to logout?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
                onConfirm={handleLogoutConfirm}
            />

            {/* Profile modal */}
            <ProfileModal
                open={profileOpen}
                onOpenChange={setProfileOpen}
            />
        </>
    );
}
