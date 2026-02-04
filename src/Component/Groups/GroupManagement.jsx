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
import {Pencil, Trash2, ArrowUpDown} from "lucide-react";
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
import EditGroupDialog from "./EditGroupDialog.jsx";
import GroupsKpiRow from "./GroupsKpiRow.jsx";
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

    // ✅ edit dialog state
    const [editOpen, setEditOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // ✅ controlled sort state for AdvancedTable
    const [tableSort, setTableSort] = useState({key: "meeting_day", dir: "asc"});

    // ✅ LO toggle: default show only today meeting-day groups
    const [loShowAll, setLoShowAll] = useState(false);

    const {toast} = useToast();

    const {
        groups = [],
        isLoading,
        createGroupMutation,
        updateGroupMutation,
        deleteGroupMutation,
    } = useGroups();

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

    /* =========================
       ✅ NEW: What LO sees in table
       - default: only TODAY meeting groups
       - button: show ALL his groups
    ========================= */
    const visibleGroups = useMemo(() => {
        if (!isLO) return roleScopedGroups;
        if (loShowAll) return roleScopedGroups;
        return roleScopedGroups.filter(isMeetingToday);
    }, [isLO, loShowAll, roleScopedGroups, istToday]); // istToday used in isMeetingToday

    /* =========================
       ✅ FIX: eligibleLoanOfficersForCreate (MISSING BEFORE)
    ========================= */
    const eligibleLoanOfficersForCreate = useMemo(() => {
        const list = loanOfficers || [];

        // Branch Manager: only same branch officers
        if (isBM && myBranchId != null) {
            return list.filter(
                (lo) => String(lo.employee?.branch_id) === String(myBranchId)
            );
        }

        // Regional Manager: only same region officers
        if (isRM && myRegionId != null) {
            return list.filter(
                (lo) => String(lo.employee?.region_id) === String(myRegionId)
            );
        }

        // Admin/others: all
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

    const openEdit = (row) => {
        setSelectedGroup(row);
        setEditOpen(true);
    };

    const highlightCell = (row) =>
        isMeetingToday(row) ? "bg-emerald-50/70 dark:bg-emerald-900/20" : "";

    // ✅ table align
    const headerCenter = "text-center";
    const tdCenter = "text-center align-middle";

    // ✅ padding applied INSIDE cell content
    const CELL_PAD = "px-5 py-4";
    const CELL_WRAP = (row) =>
        `w-full ${CELL_PAD} flex justify-center items-center text-center ${highlightCell(
            row
        )}`;
    const CELL_WRAP_GAP = (row) =>
        `w-full ${CELL_PAD} flex justify-center items-center text-center gap-2 ${highlightCell(
            row
        )}`;

    /* =========================
       ✅ Columns
       - BM: hide Branch & Region
       - LO: hide Branch, Region, Loan Officer + Action
    ========================= */
    const columns = useMemo(() => {
        const base = [
            {
                key: "group_name",
                header: "Group",
                className: headerCenter,
                tdClassName: () => tdCenter,
                cell: (row) => (
                    <div className={CELL_WRAP(row)}>
                        <span
                            className={isMeetingToday(row) ? "font-bold" : "font-medium"}
                        >
                            {row.group_name}
                        </span>
                    </div>
                ),
                sortValue: (row) => row.group_name,
            },
            {
                key: "meeting_day",
                header: "Meeting Day",
                className: headerCenter,
                tdClassName: () => tdCenter,
                cell: (row) => (
                    <div className={CELL_WRAP_GAP(row)}>
                        <Badge variant="secondary">{row.meeting_day || "—"}</Badge>
                        {isMeetingToday(row) ? (
                            <Badge className="bg-emerald-600 text-white">Today</Badge>
                        ) : null}
                    </div>
                ),
                sortValue: (row) => dayIndex(row.meeting_day),
            },
            {
                key: "lo_id",
                header: "Loan Officer",
                className: headerCenter,
                tdClassName: () => tdCenter,
                cell: (row) => {
                    const info = officerInfoById.get(Number(row.lo_id));
                    return (
                        <div className={CELL_WRAP(row)}>{info?.name || "Unknown"}</div>
                    );
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
                tdClassName: () => tdCenter,
                cell: (row) => (
                    <div className={CELL_WRAP(row)}>{getBranchName(row.branch_id)}</div>
                ),
                sortValue: (row) => getBranchName(row.branch_id),
            },
            {
                key: "region_id",
                header: "Region",
                className: headerCenter,
                tdClassName: () => tdCenter,
                cell: (row) => (
                    <div className={CELL_WRAP(row)}>{getRegionName(row.region_id)}</div>
                ),
                sortValue: (row) => getRegionName(row.region_id),
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                className: headerCenter,
                tdClassName: () => `${tdCenter} whitespace-nowrap`,
                cell: (row) => (
                    <div className={CELL_WRAP_GAP(row)}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="min-w-[100px] px-4 py-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                openEdit(row);
                            }}
                            disabled={updateGroupMutation.isPending}
                        >
                            <Pencil className="mr-2 h-4 w-4"/>
                            Edit
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="min-w-[100px] px-4 py-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row);
                            }}
                            disabled={deleteGroupMutation.isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </Button>
                    </div>
                ),
            },
        ];

        if (isLO) {
            return base.filter(
                (c) => !["lo_id", "branch_id", "region_id", "action"].includes(c.key)
            );
        }

        if (isBM) {
            return base.filter((c) => !["branch_id", "region_id"].includes(c.key));
        }

        return base;
    }, [
        officerInfoById,
        branchMap,
        regionMap,
        deleteGroupMutation.isPending,
        updateGroupMutation.isPending,
        istToday,
        isLO,
        isBM,
    ]);

    const searchKeys = useMemo(() => {
        if (isLO) return ["group_name", "meeting_day"];
        if (isBM) return ["group_name", "meeting_day", "lo_id"];
        return ["group_name", "meeting_day", "lo_id", "branch_id", "region_id"];
    }, [isLO, isBM]);

    const sortButtons = (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() =>
                    setTableSort((prev) => {
                        const key = "meeting_day";
                        if (prev.key !== key) return {key, dir: "asc"};
                        return {key, dir: prev.dir === "asc" ? "desc" : "asc"};
                    })
                }
                className="min-w-[170px] justify-center"
            >
                <ArrowUpDown className="h-4 w-4 mr-2"/>
                Meeting Day
                <span className="ml-2 text-xs text-muted-foreground">
                    ({tableSort.key === "meeting_day" ? tableSort.dir.toUpperCase() : "—"})
                </span>
            </Button>

            {!isLO ? (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        setTableSort((prev) => {
                            const key = "lo_id";
                            if (prev.key !== key) return {key, dir: "asc"};
                            return {key, dir: prev.dir === "asc" ? "desc" : "asc"};
                        })
                    }
                    className="min-w-[170px] justify-center"
                >
                    <ArrowUpDown className="h-4 w-4 mr-2"/>
                    Loan Officer
                    <span className="ml-2 text-xs text-muted-foreground">
                        ({tableSort.key === "lo_id" ? tableSort.dir.toUpperCase() : "—"})
                    </span>
                </Button>
            ) : null}

            {/* ✅ NEW: LO toggle button */}
            {isLO ? (
                <Button
                    variant={loShowAll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLoShowAll((s) => !s)}
                    className="min-w-[220px] justify-center"
                >
                    {loShowAll ? "Showing: All My Groups" : `Showing: Today (${istToday})`}
                </Button>
            ) : null}
        </div>
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>Group Management</CardTitle>
                    <CardDescription>
                        {isLO
                            ? loShowAll
                                ? "Showing all your groups"
                                : `Showing only today's meeting-day groups (${istToday})`
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
                {/* ✅ KPI should reflect what user currently sees in table */}
                <GroupsKpiRow groups={visibleGroups} isLoading={isLoading}/>

                <AdvancedTable
                    title={null}
                    description={null}
                    data={visibleGroups}
                    columns={columns}
                    isLoading={isLoading}
                    emptyText={isLO && !loShowAll ? "No meeting groups for today." : "No groups found."}
                    enableSearch
                    searchPlaceholder="Search group / meeting day..."
                    searchKeys={searchKeys}
                    enablePagination
                    initialPageSize={5}
                    rowKey={(r) => r.group_id}
                    headerRight={sortButtons}
                    sortState={tableSort}
                    onSortStateChange={setTableSort}
                    initialSort={{key: "meeting_day", dir: "asc"}}
                />
            </CardContent>

            <EditGroupDialog
                open={editOpen}
                onOpenChange={(v) => {
                    setEditOpen(v);
                    if (!v) setSelectedGroup(null);
                }}
                group={selectedGroup}
                isLO={isLO}
                isBM={isBM}
                isRM={isRM}
                myBranchId={myBranchId}
                myRegionId={myRegionId}
                eligibleLoanOfficers={eligibleLoanOfficersForCreate}
                officerLabel={officerLabel}
                days={DAYS}
                updateGroupMutation={updateGroupMutation}
                toast={toast}
            />
        </Card>
    );
}
