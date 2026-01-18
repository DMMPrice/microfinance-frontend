// src/Component/Home/Main Components/LoanOfficerManagement.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.tsx";
import {Trash2, Eye, Users2, MapPin, UserRound} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";

import StatCard from "@/Utils/StatCard.jsx";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx"; // ✅ ADD

import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useGroups} from "@/hooks/useGroups.js";

import OfficerDetailsDialog from "./OfficerDetailsDialog.jsx";

export default function LoanOfficerManagement({
                                                  variant = "compact",
                                                  showHeader = false,
                                                  showKpis = variant === "page",
                                              }) {
    const isPage = variant === "page";

    const [viewOpen, setViewOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState(null);

    // ✅ Confirm dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState({loId: null, label: ""});

    const {toast} = useToast();

    const {
        loanOfficers,
        isLoading,
        isError,
        error,
        deleteLoanOfficerMutation,
        isDeleting,
    } = useLoanOfficers();

    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {groups = []} = useGroups();

    const regionMap = useMemo(() => {
        const m = new Map();
        regions.forEach((r) => m.set(Number(r.region_id), r.region_name));
        return m;
    }, [regions]);

    const branchMap = useMemo(() => {
        const m = new Map();
        branches.forEach((b) => m.set(Number(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    const getRegionName = (regionId) => {
        const id = Number(regionId);
        if (!id) return "-";
        return regionMap.get(id) || String(id);
    };

    const getBranchName = (branchId) => {
        const id = Number(branchId);
        if (!id) return "-";
        return branchMap.get(id) || String(id);
    };

    const getBranchRegionLabelForOfficer = (officer) => {
        const emp = officer.employee;
        if (!emp) return "No employee linked";

        const branchId = emp.branch_id;
        const regionId = emp.region_id;

        if (!branchId && !regionId) return "No branch/region assigned";

        const branchName = branchId ? getBranchName(branchId) : "-";
        const regionName = regionId ? getRegionName(regionId) : "-";

        return `${branchName} • ${regionName}`;
    };

    const getGroupCountForOfficer = (loId) => {
        if (!groups || groups.length === 0) return 0;
        return groups.filter((g) => String(g.lo_id) === String(loId)).length;
    };

    const groupsTotal = useMemo(() => (Array.isArray(groups) ? groups.length : 0), [groups]);

    const assignedGroupsTotal = useMemo(() => {
        if (!groups || groups.length === 0) return 0;
        return groups.filter((g) => g.lo_id !== null && g.lo_id !== undefined).length;
    }, [groups]);

    const unassignedGroupsTotal = useMemo(() => {
        if (!groups || groups.length === 0) return 0;
        return Math.max(0, groupsTotal - assignedGroupsTotal);
    }, [groupsTotal, assignedGroupsTotal, groups]);

    const officerDisplay = useMemo(() => {
        if (!selectedOfficer) return null;

        const emp = selectedOfficer.employee || {};
        const fullName = emp.full_name || "Unknown";
        const employeeName = emp.user?.username || emp.user?.email || "Unknown";

        return {
            ...selectedOfficer,
            __display: {
                loanOfficerName: fullName,
                employeeName,
            },
        };
    }, [selectedOfficer]);

    // ------------------------------------------------------------
    // Delete flow
    // ------------------------------------------------------------
    const handleDelete = async (loId) => {
        try {
            await deleteLoanOfficerMutation.mutateAsync(loId);
            toast({title: "Loan Officer deleted"});

            if (selectedOfficer && selectedOfficer.lo_id === loId) {
                setSelectedOfficer(null);
                setViewOpen(false);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to delete Loan Officer.";
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            });
        }
    };

    // ✅ open confirm dialog instead of deleting immediately
    const requestDelete = (officer) => {
        const loId = officer?.lo_id;
        const name = officer?.employee?.full_name || `LO #${loId}`;

        setPendingDelete({loId, label: name});
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!pendingDelete.loId) return;
        const id = pendingDelete.loId;

        setConfirmOpen(false);
        setPendingDelete({loId: null, label: ""});

        await handleDelete(id);
    };

    const openViewModal = (officer) => {
        setSelectedOfficer(officer);
        setViewOpen(true);
    };

    const closeViewModal = () => {
        setSelectedOfficer(null);
        setViewOpen(false);
    };

    const boxCard = "rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow";
    const actionRow = "pt-4 mt-4 border-t flex items-center justify-between gap-2";

    return (
        <div className="space-y-4">
            {showHeader ? (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-semibold leading-none">
                            Loan Officer Management
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            View and manage registered Loan Officers.
                        </p>
                    </div>
                </div>
            ) : null}

            {showKpis ? (
                <div className={`grid gap-4 ${isPage ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
                    <StatCard
                        title="Total Loan Officers"
                        value={loanOfficers?.length ?? 0}
                        subtitle="Registered in the system"
                        Icon={UserRound}
                        to={isPage ? undefined : "/dashboard/officers"}
                    />
                    <StatCard title="Regions" value={regions?.length ?? 0} subtitle="Active regions" Icon={MapPin}/>
                    <StatCard title="Groups" value={groupsTotal} subtitle="Total groups" Icon={Users2}/>
                    <StatCard title="Unassigned Groups" value={unassignedGroupsTotal} subtitle="Not linked to any LO"
                              Icon={Users2}/>
                </div>
            ) : null}

            {isLoading && (
                <Card className={boxCard}>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Loading Loan Officers...
                    </CardContent>
                </Card>
            )}

            {isError && !isLoading && (
                <Card className={boxCard}>
                    <CardContent className="py-10 text-center text-destructive">
                        Failed to load Loan Officers: {error?.message || "Unknown error"}
                    </CardContent>
                </Card>
            )}

            {!isLoading && !isError && (
                <>
                    <div className={`grid gap-4 ${isPage ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"}`}>
                        {loanOfficers.map((officer) => {
                            const emp = officer.employee;
                            const fullName = emp?.full_name || "Unknown Employee";
                            const email = emp?.user?.email || emp?.user?.username || "No user linked";

                            const branchRegionLabel = getBranchRegionLabelForOfficer(officer);
                            const groupCount = getGroupCountForOfficer(officer.lo_id);

                            return (
                                <Card key={officer.lo_id} className={boxCard}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <CardTitle className="text-base font-semibold truncate">
                                                    {fullName}
                                                </CardTitle>
                                                <CardDescription className="truncate">
                                                    {email}
                                                </CardDescription>

                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <Badge variant="secondary"
                                                           className="rounded-lg px-2.5 py-1 text-xs">
                                                        LO ID: {officer.lo_id}
                                                    </Badge>

                                                    <Badge variant="outline" className="rounded-lg px-2.5 py-1 text-xs">
                                                        <MapPin className="mr-1 h-3.5 w-3.5"/>
                                                        {branchRegionLabel}
                                                    </Badge>

                                                    {groupCount > 0 ? (
                                                        <Badge variant="outline"
                                                               className="rounded-lg px-2.5 py-1 text-xs">
                                                            <Users2 className="mr-1 h-3.5 w-3.5"/>
                                                            Groups: {groupCount}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {isPage ? (
                                                <Badge className="rounded-lg px-2.5 py-1 text-xs">
                                                    Active
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <div className={actionRow}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-lg"
                                                onClick={() => openViewModal(officer)}
                                            >
                                                <Eye className="mr-2 h-4 w-4"/>
                                                View
                                            </Button>

                                            {/* ✅ now uses confirm */}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="rounded-lg"
                                                disabled={isDeleting}
                                                onClick={() => requestDelete(officer)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {loanOfficers.length === 0 && (
                        <Card className={boxCard}>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <p className="text-muted-foreground">
                                    No Loan Officers registered yet.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* ✅ View Details Dialog */}
            <OfficerDetailsDialog
                open={viewOpen}
                onClose={(open) => {
                    if (!open) closeViewModal();
                    else setViewOpen(true);
                }}
                officer={officerDisplay}
                // ✅ from modal, also confirm before deleting
                onDelete={() => requestDelete(selectedOfficer)}
                branchRegionLabel={selectedOfficer ? getBranchRegionLabelForOfficer(selectedOfficer) : ""}
                groupCount={selectedOfficer ? getGroupCountForOfficer(selectedOfficer.lo_id) : 0}
            />

            {/* ✅ Confirm Dialog */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete Loan Officer?"
                description={
                    pendingDelete.label
                        ? `This will permanently delete "${pendingDelete.label}". This action cannot be undone.`
                        : "This will permanently delete the Loan Officer. This action cannot be undone."
                }
                confirmText="Delete"
                confirmVariant="destructive"
                onConfirm={confirmDelete}
            />
        </div>
    );
}
