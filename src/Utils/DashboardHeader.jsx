// src/Utils/DashboardHeader.jsx
import {useMemo, useState} from "react";
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Button} from "@/components/ui/button.tsx";
import {LogOut, ChevronRight, User, RefreshCcw} from "lucide-react";
import {Link, useNavigate} from "react-router-dom";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";
import ProfileModal from "@/Utils/ProfileModal.jsx";

import {useRegions} from "@/hooks/useRegions";
import {useBranches} from "@/hooks/useBranches";

// ✅ same as HeaderBar
import {useQueryClient} from "@tanstack/react-query";

const isElectron =
    typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent);

/**
 * DashboardHeader (Breadcrumb + Dynamic)
 */
export default function DashboardHeader({
                                            variant = "top",
                                            title,
                                            subtitle,
                                            breadcrumbs = null,
                                            rightContent = null,
                                            showLogout = true,

                                            // ✅ NEW: show refresh button
                                            showReload = false,
                                        }) {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [logoutOpen, setLogoutOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // ✅ NEW: reload animation state
    const [reloading, setReloading] = useState(false);

    /* ---------------- Profile data ---------------- */

    const profileData = useMemo(() => {
        try {
            const raw = localStorage.getItem("profileData");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [profileOpen]);

    const role = String(user?.role || profileData?.role || "").toLowerCase();

    const regionId = profileData?.region_id ?? null;
    const branchId = profileData?.branch_id ?? null;

    /* ---------------- Resolve names (name only, no ids) ---------------- */

    const {getRegionName} = useRegions();

    const regionIdForBranches =
        profileData?.region_id ??
        profileData?.region?.region_id ??
        profileData?.region?.id ??
        user?.region_id ??
        null;

    const {getBranchName} = useBranches(regionIdForBranches);

    const regionName =
        profileData?.region_name ||
        profileData?.region?.region_name ||
        profileData?.region?.name ||
        getRegionName(regionId) ||
        "";

    const branchName =
        profileData?.branch_name ||
        profileData?.branch?.branch_name ||
        profileData?.branch?.name ||
        getBranchName(branchId) ||
        "";

    const profileContext = useMemo(() => {
        if (role === "regional_manager" && regionName) {
            return {type: "REGION", value: regionName};
        }
        if ((role === "branch_manager" || role === "loan_officer") && branchName) {
            return {type: "BRANCH", value: branchName};
        }
        return null;
    }, [role, regionName, branchName]);

    /* ---------------- Titles ---------------- */

    const computedTitle = useMemo(() => {
        if (title) return title;
        if (variant === "sidebar") return "Micro Finance";
        return user?.name || "Dashboard";
    }, [title, user?.name, variant]);

    const computedSubtitle = useMemo(() => {
        if (subtitle !== undefined) return subtitle;
        if (variant === "sidebar") return "";
        return user?.role ? String(user.role) : "";
    }, [subtitle, user?.role, variant]);

    const handleLogoutConfirm = () => {
        logout();
        setLogoutOpen(false);
        navigate("/login");
    };

    /* ---------------- ✅ Reload logic (animated) ---------------- */

    const handleManualRefresh = async () => {
        if (reloading) return;

        setReloading(true);
        try {
            if (isElectron) {
                // invalidateQueries can be async; awaiting keeps spinner consistent
                await queryClient.invalidateQueries();
            } else {
                // browser refresh - spinner will show briefly before reload
                window.location.reload();
            }
        } finally {
            // In browser reload this won't really run because page reloads,
            // but in Electron it will stop spinner correctly.
            setReloading(false);
        }
    };

    /* ---------------- Buttons ---------------- */

    const ReloadBtn = showReload ? (
        <Button
            size="icon"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={reloading}
            title={reloading ? "Reloading..." : "Reload"}
            aria-label="Reload"
            className="
        rounded-full
        border-border
        text-muted-foreground
        hover:text-foreground
        hover:bg-muted/50
        shadow-none
      "
        >
            <RefreshCcw
                className={[
                    "h-4 w-4",
                    "transition-transform",
                    reloading ? "animate-spin" : "active:rotate-180",
                ].join(" ")}
            />
        </Button>
    ) : null;

    const ProfileBtn = (
        <div className="flex items-center gap-2">
            {profileContext ? (
                <div
                    className="
            flex items-center gap-1.5
            rounded-full
            border border-border/60
            bg-muted/70
            px-3 py-1
            text-xs
            font-medium
            text-muted-foreground
            max-w-[260px]
            truncate
          "
                    title={`${profileContext.value} ${profileContext.type}`}
                >
                    <span className="truncate">{profileContext.value}</span>
                    <span className="opacity-60">·</span>
                    <span className="uppercase tracking-wide text-[10px] opacity-70">
            {profileContext.type}
          </span>
                </div>
            ) : null}

            <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
                <User className="mr-2 h-4 w-4"/>
                Profile
            </Button>
        </div>
    );

    const LogoutBtn = showLogout ? (
        <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>
            <LogOut className="mr-2 h-4 w-4"/>
            Logout
        </Button>
    ) : null;

    const RightArea = (
        <div className="flex items-center gap-2">
            {rightContent}
            {ReloadBtn}
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
                        <Link to={b.to} className="hover:text-foreground transition-colors">
                            {b.label}
                        </Link>
                    ) : (
                        <span className={last ? "text-foreground font-medium" : ""}>
              {b.label}
            </span>
                    );

                return (
                    <div key={`${b.label}-${idx}`} className="flex items-center gap-2">
                        {idx !== 0 && <ChevronRight className="h-4 w-4 opacity-60"/>}
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
                        <h2 className="text-lg font-semibold truncate">{computedTitle}</h2>
                        {computedSubtitle ? (
                            <p className="text-xs text-muted-foreground truncate">
                                {computedSubtitle}
                            </p>
                        ) : null}
                    </div>
                    {RightArea}
                </div>

                <ConfirmDialog
                    open={logoutOpen}
                    onOpenChange={setLogoutOpen}
                    title="Logout confirmation"
                    description="Are you sure you want to logout?"
                    confirmLabel="Logout"
                    cancelLabel="Cancel"
                    onConfirm={handleLogoutConfirm}
                />

                <ProfileModal open={profileOpen} onOpenChange={setProfileOpen}/>
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

            <ConfirmDialog
                open={logoutOpen}
                onOpenChange={setLogoutOpen}
                title="Logout confirmation"
                description="Are you sure you want to logout?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
                onConfirm={handleLogoutConfirm}
            />

            <ProfileModal open={profileOpen} onOpenChange={setProfileOpen}/>
        </>
    );
}
