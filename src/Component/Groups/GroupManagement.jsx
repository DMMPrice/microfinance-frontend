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
import {Badge} from "@/components/ui/badge.tsx";
import {Trash2} from "lucide-react";
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

import CreateGroupDialog from "./CreateGroupDialog.jsx";
import {getISTWeekday} from "@/Helpers/dateTimeIST.js";

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const dayIndex = (d) => {
    const idx = DAYS.findIndex(
        (x) => String(x).toLowerCase() === String(d || "").trim().toLowerCase()
    );
    return idx === -1 ? 999 : idx;
};

export default function GroupManagement() {
    const [open, setOpen] = useState(false);
    const {toast} = useToast();

    const {groups = [], isLoading, createGroupMutation, deleteGroupMutation} =
        useGroups();
    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {loanOfficers = []} = useLoanOfficers();

    // ✅ IST weekday
    const istToday = useMemo(() => getISTWeekday(), []);
    const isMeetingToday = (row) =>
        String(row?.meeting_day || "").trim().toLowerCase() ===
        String(istToday || "").trim().toLowerCase();

    /* =========================
       ✅ ProfileData (given)
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
       ✅ Role-based visibility for table data
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

        return [];
    }, [groups, isAdmin, isLO, isBM, isRM, myLoId, myBranchId, myRegionId]);

    // ✅ By default sort by Meeting Day (Mon..Sun)
    const sortedGroups = useMemo(() => {
        const arr = Array.isArray(roleScopedGroups) ? [...roleScopedGroups] : [];
        arr.sort((a, b) => {
            const da = dayIndex(a?.meeting_day);
            const db = dayIndex(b?.meeting_day);
            if (da !== db) return da - db;
            // then by group name
            return String(a?.group_name || "").localeCompare(String(b?.group_name || ""));
        });
        return arr;
    }, [roleScopedGroups]);

    /* =========================
       ✅ Create dialog LO list
    ========================= */
    const eligibleLoanOfficersForCreate = useMemo(() => {
        const list = loanOfficers || [];
        if (isBM && myBranchId != null) {
            return list.filter(
                (lo) => String(lo.employee?.branch_id) === String(myBranchId)
            );
        }
        if (isRM && myRegionId != null) {
            return list.filter(
                (lo) => String(lo.employee?.region_id) === String(myRegionId)
            );
        }
        return list;
    }, [loanOfficers, isBM, isRM, myBranchId, myRegionId]);

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

    const highlightCell = (row) =>
        isMeetingToday(row) ? "bg-emerald-50/70 dark:bg-emerald-900/20" : "";

    const headerCenter = "text-center";
    const tdCenter = "px-3 py-3 text-center align-middle";

    /* =========================
       ✅ AdvancedTable columns
       Role requirement:
       1) Branch Manager -> hide Branch & Region
       2) Loan Officer -> hide Branch, Region, and Loan Officer
       Also: center align header + data
    ========================= */
    const columns = useMemo(() => {
        const base = [
            {
                key: "group_name",
                header: "Group",
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} ${highlightCell(row)}`,
                cell: (row) => (
                    <span className={isMeetingToday(row) ? "font-bold" : "font-medium"}>
                        {row.group_name}
                    </span>
                ),
                sortValue: (row) => row.group_name,
            },
            {
                key: "meeting_day",
                header: "Meeting Day",
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} ${highlightCell(row)}`,
                cell: (row) => (
                    <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary">{row.meeting_day || "—"}</Badge>
                        {isMeetingToday(row) ? (
                            <Badge className="bg-emerald-600 text-white">Today</Badge>
                        ) : null}
                    </div>
                ),
                // Keep sortValue stable (table sorting) but we already pre-sort in data
                sortValue: (row) => dayIndex(row.meeting_day),
            },
            {
                key: "lo_id",
                header: "Loan Officer",
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} ${highlightCell(row)}`,
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
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} ${highlightCell(row)}`,
                cell: (row) => getBranchName(row.branch_id),
                sortValue: (row) => getBranchName(row.branch_id),
            },
            {
                key: "region_id",
                header: "Region",
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} ${highlightCell(row)}`,
                cell: (row) => getRegionName(row.region_id),
                sortValue: (row) => getRegionName(row.region_id),
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                className: headerCenter,
                tdClassName: (row) => `${tdCenter} whitespace-nowrap ${highlightCell(row)}`,
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

        // ✅ Role based column hiding
        if (isLO) {
            // No need to show Branch, Region, and Loan Officer
            return base.filter((c) => !["lo_id", "branch_id", "region_id"].includes(c.key));
        }
        if (isBM) {
            // No need to show Branch and Region
            return base.filter((c) => !["branch_id", "region_id"].includes(c.key));
        }
        return base;
    }, [
        officerInfoById,
        branchMap,
        regionMap,
        deleteGroupMutation.isPending,
        istToday,
        isLO,
        isBM,
    ]);

    // ✅ Search keys should match visible columns
    const searchKeys = useMemo(() => {
        if (isLO) return ["group_name", "meeting_day"];
        if (isBM) return ["group_name", "meeting_day", "lo_id"];
        return ["group_name", "meeting_day", "lo_id", "branch_id", "region_id"];
    }, [isLO, isBM]);

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

                <CreateGroupDialog
                    open={open}
                    onOpenChange={setOpen}
                    isLO={isLO}
                    isBM={isBM}
                    isRM={isRM}
                    myBranchId={myBranchId}
                    myRegionId={myRegionId}
                    eligibleLoanOfficers={eligibleLoanOfficersForCreate}
                    officerLabel={officerLabel}
                    createGroupMutation={createGroupMutation}
                    toast={toast}
                    days={DAYS}
                />
            </CardHeader>

            <CardContent>
                <AdvancedTable
                    title={null}
                    description={null}
                    data={sortedGroups}
                    columns={columns}
                    isLoading={isLoading}
                    emptyText="No groups found."
                    enableSearch
                    searchPlaceholder="Search group / meeting day..."
                    searchKeys={searchKeys}
                    enablePagination
                    initialPageSize={10}
                    rowKey={(r) => r.group_id}
                    rowClassName={(row) =>
                        isMeetingToday(row)
                            ? "bg-emerald-50/70 dark:bg-emerald-900/20"
                            : ""
                    }
                />
            </CardContent>
        </Card>
    );
}
