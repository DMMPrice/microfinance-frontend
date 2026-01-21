// src/Component/Groups/GroupManagement.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Plus, Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";

import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import {confirmDelete} from "@/Utils/confirmDelete.js";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

import {
    getProfileData,
    getUserRole,
    getUserBranchId,
    getUserRegionId,
    isBranchManagerRole,
    isRegionalManagerRole,
    isAdminLikeRole,
} from "@/hooks/useApi.js";

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export default function GroupManagement() {
    // Create modal state
    const [open, setOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [meetingDay, setMeetingDay] = useState("");
    const [loanOfficerId, setLoanOfficerId] = useState("");

    const {toast} = useToast();

    const {groups = [], isLoading, createGroupMutation, deleteGroupMutation} =
        useGroups();
    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {loanOfficers = []} = useLoanOfficers();

    /* =========================
       ✅ ProfileData (given)
       {
         user_id, employee_id, role,
         region_id, branch_id, exp
       }
    ========================= */
    const profile = getProfileData();
    const role = getUserRole();
    const myBranchId = getUserBranchId();
    const myRegionId = getUserRegionId();
    const myEmployeeId = profile?.employee_id ?? null;

    const r = (role || "").toString().trim().toLowerCase();
    const isLO = r === "loan_officer";
    const isBM = isBranchManagerRole(role);
    const isRM = isRegionalManagerRole(role);
    const isAdmin = isAdminLikeRole(role);

    // ✅ find current user's lo_id (needed for loan_officer filtering)
    const myLoId = useMemo(() => {
        if (!myEmployeeId) return null;
        const me = (loanOfficers || []).find(
            (lo) => String(lo.employee_id) === String(myEmployeeId)
        );
        return me?.lo_id ?? null;
    }, [loanOfficers, myEmployeeId]);

    const branchMap = useMemo(() => {
        const m = new Map();
        (branches || []).forEach((b) => m.set(Number(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    const regionMap = useMemo(() => {
        const m = new Map();
        (regions || []).forEach((r) => m.set(Number(r.region_id), r.region_name));
        return m;
    }, [regions]);

    const getBranchName = (branchId) =>
        branchMap.get(Number(branchId)) || "Unknown";

    const getRegionName = (regionId) =>
        regionMap.get(Number(regionId)) || "Unknown";

    const officerInfoById = useMemo(() => {
        const m = new Map();
        (loanOfficers || []).forEach((lo) => {
            const emp = lo.employee;
            m.set(Number(lo.lo_id), {
                name: emp?.full_name || "Unknown",
                branch_id: emp?.branch_id,
                region_id: emp?.region_id,
            });
        });
        return m;
    }, [loanOfficers]);

    const officerLabel = (lo) => {
        const emp = lo.employee;
        const name = emp?.full_name || `Employee ${lo.employee_id}`;
        const bName = emp?.branch_id ? getBranchName(emp.branch_id) : "Unknown";
        return `${name} (${bName})`;
    };

    /* =========================
       ✅ Role-based visibility for table data:
       - Loan Officer: only own groups (by lo_id)
       - Branch Manager: only own branch groups (branch_id)
       - Regional Manager: entire region (region_id)
       - Admin/Super Admin: all
    ========================= */
    const roleScopedGroups = useMemo(() => {
        const list = Array.isArray(groups) ? groups : [];

        if (isAdmin) return list;

        if (isLO) {
            if (!myLoId) return [];
            return list.filter((g) => String(g.lo_id) === String(myLoId));
        }

        if (isBM) {
            if (!myBranchId) return [];
            return list.filter((g) => String(g.branch_id) === String(myBranchId));
        }

        if (isRM) {
            if (!myRegionId) return [];
            return list.filter((g) => String(g.region_id) === String(myRegionId));
        }

        // default fallback: show nothing
        return [];
    }, [groups, isAdmin, isLO, isBM, isRM, myLoId, myBranchId, myRegionId]);

    /* =========================
       ✅ Create dialog LO list:
       - BM: only officers in same branch
       - Others (admin/rm): all
       - LO: cannot open dialog
    ========================= */
    const eligibleLoanOfficersForCreate = useMemo(() => {
        const list = loanOfficers || [];
        if (isBM && myBranchId != null) {
            return list.filter(
                (lo) => String(lo.employee?.branch_id) === String(myBranchId)
            );
        }
        if (isRM && myRegionId != null) {
            // optional: regional manager sees only their region officers
            return list.filter(
                (lo) => String(lo.employee?.region_id) === String(myRegionId)
            );
        }
        return list; // admin-like etc.
    }, [loanOfficers, isBM, isRM, myBranchId, myRegionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLO) {
            toast({
                title: "Not allowed",
                description: "Loan Officer cannot create groups.",
                variant: "destructive",
            });
            return;
        }

        const lo = eligibleLoanOfficersForCreate.find(
            (x) => String(x.lo_id) === String(loanOfficerId)
        );
        if (!lo) {
            toast({title: "Loan officer not found", variant: "destructive"});
            return;
        }

        const branchId = lo.employee?.branch_id;
        const regionId = lo.employee?.region_id;

        if (!branchId || !regionId) {
            toast({
                title: "Missing branch/region",
                description:
                    "Selected loan officer does not have branch_id/region_id in employee.",
                variant: "destructive",
            });
            return;
        }

        // ✅ BM must match branch
        if (isBM && myBranchId != null && String(branchId) !== String(myBranchId)) {
            toast({
                title: "Not allowed",
                description: "You can only assign loan officers from your own branch.",
                variant: "destructive",
            });
            return;
        }

        // ✅ RM must match region (optional but consistent)
        if (isRM && myRegionId != null && String(regionId) !== String(myRegionId)) {
            toast({
                title: "Not allowed",
                description: "You can only assign loan officers from your own region.",
                variant: "destructive",
            });
            return;
        }

        try {
            await createGroupMutation.mutateAsync({
                group_name: groupName,
                lo_id: Number(lo.lo_id),
                region_id: Number(regionId),
                branch_id: Number(branchId),
                meeting_day: meetingDay,
            });

            toast({title: "Group created successfully"});
            setGroupName("");
            setMeetingDay("");
            setLoanOfficerId("");
            setOpen(false);
        } catch (err) {
            toast({
                title: "Failed to create group",
                description:
                    err?.response?.data?.detail || err?.message || "Unexpected error",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (group) => {
        const gid = group.group_id;

        const ok = await confirmDelete?.({
            title: "Delete group?",
            description: `This will permanently delete "${group.group_name}".`,
            confirmText: "Delete",
        });

        const fallbackOk =
            ok === undefined
                ? window.confirm(`Delete group "${group.group_name}"?`)
                : ok;

        if (!fallbackOk) return;

        try {
            await deleteGroupMutation.mutateAsync(gid);
            toast({title: "Group deleted"});
        } catch (err) {
            toast({
                title: "Failed to delete group",
                description:
                    err?.response?.data?.detail || err?.message || "Unexpected error",
                variant: "destructive",
            });
        }
    };

    /* =========================
       ✅ AdvancedTable columns
    ========================= */
    const columns = useMemo(() => {
        return [
            {
                key: "group_name",
                header: "Group",
                cell: (row) => <span className="font-medium">{row.group_name}</span>,
                sortValue: (row) => row.group_name,
            },
            {
                key: "meeting_day",
                header: "Meeting Day",
                cell: (row) => (
                    <Badge variant="secondary">{row.meeting_day || "—"}</Badge>
                ),
                sortValue: (row) => row.meeting_day,
            },
            {
                key: "lo_id",
                header: "Loan Officer",
                cell: (row) => {
                    const info = officerInfoById.get(Number(row.lo_id));
                    return info?.name || "Unknown";
                },
                sortValue: (row) => {
                    const info = officerInfoById.get(Number(row.lo_id));
                    return info?.name || "";
                },
            },
            {
                key: "branch_id",
                header: "Branch",
                cell: (row) => getBranchName(row.branch_id),
                sortValue: (row) => getBranchName(row.branch_id),
            },
            {
                key: "region_id",
                header: "Region",
                cell: (row) => getRegionName(row.region_id),
                sortValue: (row) => getRegionName(row.region_id),
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                className: "text-center",
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
                cell: (row) => (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row);
                        }}
                        disabled={deleteGroupMutation.isPending}
                    >
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete
                    </Button>
                ),
            },
        ];
    }, [officerInfoById, branchMap, regionMap, deleteGroupMutation.isPending]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>Group Management</CardTitle>
                    <CardDescription>
                        {isLO
                            ? "Showing your groups only"
                            : isBM
                                ? "Showing groups for your branch"
                                : isRM
                                    ? "Showing groups for your region"
                                    : "Showing all groups"}
                    </CardDescription>
                </div>

                {/* ✅ Create Group */}
                <Dialog
                    open={open}
                    onOpenChange={(v) => {
                        if (isLO) return; // LO can't open
                        setOpen(v);
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            disabled={isLO || eligibleLoanOfficersForCreate.length === 0}
                            title={
                                isLO
                                    ? "Loan Officer cannot create groups"
                                    : eligibleLoanOfficersForCreate.length === 0
                                        ? "No eligible loan officers found"
                                        : ""
                            }
                        >
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Group
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Assign to Loan Officer</Label>
                                <Select
                                    value={loanOfficerId}
                                    onValueChange={setLoanOfficerId}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select loan officer"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleLoanOfficersForCreate.map((lo) => (
                                            <SelectItem key={lo.lo_id} value={String(lo.lo_id)}>
                                                {officerLabel(lo)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Group Name</Label>
                                    <Input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="e.g., Group A"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Meeting Day</Label>
                                    <Select
                                        value={meetingDay}
                                        onValueChange={setMeetingDay}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select day"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS.map((d) => (
                                                <SelectItem key={d} value={d}>
                                                    {d}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={createGroupMutation.isPending}
                            >
                                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                {/* ✅ AdvancedTable used here */}
                <AdvancedTable
                    title={null}
                    description={null}
                    data={roleScopedGroups}
                    columns={columns}
                    isLoading={isLoading}
                    emptyText="No groups found."
                    enableSearch
                    searchPlaceholder="Search group / officer / branch / region..."
                    // Search uses these keys (sortValue in columns handles officer/branch/region)
                    searchKeys={["group_name", "meeting_day", "lo_id", "branch_id", "region_id"]}
                    enablePagination
                    initialPageSize={10}
                    rowKey={(r) => r.group_id}
                />
            </CardContent>
        </Card>
    );
}
