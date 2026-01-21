// src/Utils/ProfileModal.jsx
import React, {useMemo} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";

import {useRegions} from "@/hooks/useRegions";
import {useBranches} from "@/hooks/useBranches";

function safeParseJSON(value) {
    try {
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function prettyLabel(key) {
    return String(key)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProfileModal({open, onOpenChange}) {
    const profileData = useMemo(() => {
        return safeParseJSON(localStorage.getItem("profileData"));
    }, [open]);

    const {getRegionName} = useRegions();

    const regionId = profileData?.region_id ?? null;
    const {getBranchName} = useBranches(regionId);

    // ❌ keys to hide
    const HIDE_KEYS = new Set(["user_id", "exp", "region_id", "branch_id"]);

    const rows = useMemo(() => {
        if (!profileData || typeof profileData !== "object") return [];

        const base = Object.entries(profileData).filter(([key]) => !HIDE_KEYS.has(key));

        // ✅ names only (no #id fallback)
        const regionName = getRegionName(profileData?.region_id) || "-";
        const branchName = getBranchName(profileData?.branch_id) || "-";

        const out = [];
        for (const [k, v] of base) {
            out.push([k, v]);
            if (k === "role") {
                out.push(["region_name", regionName]);
                out.push(["branch_name", branchName]);
            }
        }

        const hasRole = base.some(([k]) => k === "role");
        if (!hasRole) {
            out.push(["region_name", regionName]);
            out.push(["branch_name", branchName]);
        }

        return out;
    }, [profileData, getRegionName, getBranchName]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Profile
                        {profileData?.role ? (
                            <Badge variant="secondary" className="capitalize">
                                {String(profileData.role).replace(/_/g, " ")}
                            </Badge>
                        ) : null}
                    </DialogTitle>

                    <DialogDescription>
                        Your session/profile details from local storage.
                    </DialogDescription>
                </DialogHeader>

                <Separator/>

                {!profileData ? (
                    <div className="text-sm text-muted-foreground">
                        No <code>profileData</code> found in localStorage.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {rows.map(([key, val]) => {
                            const isRole = key === "role";

                            const valueText =
                                val === null || val === undefined
                                    ? "-"
                                    : typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val);

                            const label =
                                key === "region_name"
                                    ? "Region"
                                    : key === "branch_name"
                                        ? "Branch"
                                        : prettyLabel(key);

                            return (
                                <div
                                    key={key}
                                    className="flex items-start justify-between gap-4 rounded-md border border-border/60 p-3"
                                >
                                    <div className="text-sm font-medium text-foreground">
                                        {label}
                                    </div>

                                    <div className="text-sm text-muted-foreground text-right break-all">
                                        {isRole ? (
                                            <span className="capitalize">
                                                {valueText.replace(/_/g, " ")}
                                            </span>
                                        ) : (
                                            valueText
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
