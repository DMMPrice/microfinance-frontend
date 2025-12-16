// src/Component/Home/Main Components/LoanOfficerManagement.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useGroups} from "@/hooks/useGroups.js";

import OfficerDetailsDialog from "./OfficerDetailsDialog.jsx";

export default function LoanOfficerManagement() {
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState(null);

    const {toast} = useToast();

    // 🔹 Loan Officers
    const {
        loanOfficers,
        isLoading,
        isError,
        error,
        deleteLoanOfficerMutation,
        isDeleting,
    } = useLoanOfficers();

    // 🔹 Branches / Regions for name resolution
    const {branches = []} = useBranches();
    const {regions = []} = useRegions();

    // 🔹 Groups for per-LO count
    const {groups = []} = useGroups();

    // ------------------------------------------------------------
    // Maps for id -> name
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    const getBranchRegionLabelForOfficer = (officer) => {
        const emp = officer.employee;
        if (!emp) return "No employee linked";

        const branchId = emp.branch_id;
        const regionId = emp.region_id;

        if (!branchId && !regionId) return "No branch/region assigned";

        const branchName = branchId ? getBranchName(branchId) : "-";
        const regionName = regionId ? getRegionName(regionId) : "-";

        return `${branchName} (${regionName})`;
    };

    const getGroupCountForOfficer = (loId) => {
        if (!groups || groups.length === 0) return 0;
        return groups.filter((g) => String(g.lo_id) === String(loId)).length;
    };

    // ✅ Replace IDs with Names in view modal
    const officerDisplay = useMemo(() => {
        if (!selectedOfficer) return null;

        const emp = selectedOfficer.employee || {};
        const fullName = emp.full_name || "Unknown";

        // "Employee Name" here means login username/email (you can change as you want)
        const employeeName =
            emp.user?.username ||
            emp.user?.email ||
            "Unknown";

        return {
            ...selectedOfficer,
            __display: {
                loanOfficerName: fullName, // instead of Loan Officer ID
                employeeName,              // instead of Employee ID
            },
        };
    }, [selectedOfficer]);

    // ------------------------------------------------------------
    // Handlers
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

    const openViewModal = (officer) => {
        setSelectedOfficer(officer);
        setViewOpen(true);
    };

    const closeViewModal = () => {
        setSelectedOfficer(null);
        setViewOpen(false);
    };

    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Loan Officer Management</h3>
                    <p className="text-sm text-muted-foreground">
                        View and manage registered Loan Officers.
                    </p>
                </div>
            </div>

            {isLoading && (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Loading Loan Officers...
                    </CardContent>
                </Card>
            )}

            {isError && !isLoading && (
                <Card>
                    <CardContent className="py-8 text-center text-destructive">
                        Failed to load Loan Officers: {error?.message || "Unknown error"}
                    </CardContent>
                </Card>
            )}

            {!isLoading && !isError && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loanOfficers.map((officer) => {
                            const emp = officer.employee;
                            const fullName = emp?.full_name || "Unknown Employee";
                            const email =
                                emp?.user?.email ||
                                emp?.user?.username ||
                                "No user linked";

                            const branchRegionLabel = getBranchRegionLabelForOfficer(officer);
                            const groupCount = getGroupCountForOfficer(officer.lo_id);

                            return (
                                <Card key={officer.lo_id}>
                                    <CardHeader>
                                        <CardTitle>{fullName}</CardTitle>
                                        <CardDescription>
                                            {email}
                                            <br/>
                                            {branchRegionLabel}
                                            {groupCount > 0 && (
                                                <>
                                                    <br/>
                                                    Groups assigned: {groupCount}
                                                </>
                                            )}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex justify-between items-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openViewModal(officer)}
                                        >
                                            View
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={isDeleting}
                                            onClick={() => handleDelete(officer.lo_id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Delete
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {loanOfficers.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <p className="text-muted-foreground">
                                    No Loan Officers registered yet.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* ✅ View Details Dialog (NO EDIT) */}
            <OfficerDetailsDialog
                open={viewOpen}
                onClose={(open) => {
                    if (!open) closeViewModal();
                    else setViewOpen(true);
                }}
                officer={officerDisplay}
                onDelete={handleDelete}
                hideEdit // ✅ NEW PROP (we'll use it inside dialog)
                replaceIdsWithNames // ✅ NEW PROP (optional)
                branchRegionLabel={
                    selectedOfficer ? getBranchRegionLabelForOfficer(selectedOfficer) : ""
                }
                groupCount={
                    selectedOfficer ? getGroupCountForOfficer(selectedOfficer.lo_id) : 0
                }
            />
        </div>
    );
}
