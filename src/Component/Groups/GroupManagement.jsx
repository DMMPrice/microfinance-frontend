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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Plus, Trash2, Search} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";

import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

// If you already use this in BranchManagement, keep consistent:
import {confirmDelete} from "@/Utils/confirmDelete.js";

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

    // Filters
    const [q, setQ] = useState("");
    const [filterRegionId, setFilterRegionId] = useState("all");
    const [filterBranchId, setFilterBranchId] = useState("all");
    const [filterOfficerId, setFilterOfficerId] = useState("all");

    const {toast} = useToast();

    const {groups = [], isLoading, createGroupMutation, deleteGroupMutation} =
        useGroups();
    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {loanOfficers = []} = useLoanOfficers();

    const branchMap = useMemo(() => {
        const m = new Map();
        branches.forEach((b) => m.set(Number(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    const regionMap = useMemo(() => {
        const m = new Map();
        regions.forEach((r) => m.set(Number(r.region_id), r.region_name));
        return m;
    }, [regions]);

    const getBranchName = (branchId) =>
        branchMap.get(Number(branchId)) || "Unknown";

    const getRegionName = (regionId) =>
        regionMap.get(Number(regionId)) || "Unknown";

    const officerLabel = (lo) => {
        const emp = lo.employee;
        const name = emp?.full_name || `Employee ${lo.employee_id}`;
        const bName = emp?.branch_id ? getBranchName(emp.branch_id) : "Unknown";
        return `${name} (${bName})`;
    };

    const officerInfoById = useMemo(() => {
        const m = new Map();
        loanOfficers.forEach((lo) => {
            const emp = lo.employee;
            m.set(Number(lo.lo_id), {
                name: emp?.full_name || "Unknown",
                branch_id: emp?.branch_id,
                region_id: emp?.region_id,
            });
        });
        return m;
    }, [loanOfficers]);

    const filteredGroups = useMemo(() => {
        const query = q.trim().toLowerCase();

        return (groups || []).filter((g) => {
            const info = officerInfoById.get(Number(g.lo_id));
            const officerName = info?.name || "";
            const branchOk =
                filterBranchId === "all" ||
                String(g.branch_id) === String(filterBranchId);
            const regionOk =
                filterRegionId === "all" ||
                String(g.region_id) === String(filterRegionId);
            const officerOk =
                filterOfficerId === "all" ||
                String(g.lo_id) === String(filterOfficerId);

            const textOk =
                !query ||
                String(g.group_name || "").toLowerCase().includes(query) ||
                String(g.meeting_day || "").toLowerCase().includes(query) ||
                String(officerName).toLowerCase().includes(query) ||
                String(getBranchName(g.branch_id)).toLowerCase().includes(query) ||
                String(getRegionName(g.region_id)).toLowerCase().includes(query);

            return branchOk && regionOk && officerOk && textOk;
        });
    }, [
        groups,
        q,
        filterBranchId,
        filterRegionId,
        filterOfficerId,
        officerInfoById,
        branchMap,
        regionMap,
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const lo = loanOfficers.find((x) => String(x.lo_id) === String(loanOfficerId));
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
                description: err?.response?.data?.detail || err?.message || "Unexpected error",
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

        // If confirmDelete is not available, fallback:
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
                description: err?.response?.data?.detail || err?.message || "Unexpected error",
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>Group Management</CardTitle>
                    <CardDescription>Create and manage borrower groups</CardDescription>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={loanOfficers.length === 0}>
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
                                <Select value={loanOfficerId} onValueChange={setLoanOfficerId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select loan officer"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loanOfficers.map((lo) => (
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
                                    <Select value={meetingDay} onValueChange={setMeetingDay} required>
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

                            <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Filters (like Loan Officers / Branches pages) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search group / officer / branch / region..."
                            className="pl-9"
                        />
                    </div>

                    <Select value={filterRegionId} onValueChange={setFilterRegionId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by region"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            {regions.map((r) => (
                                <SelectItem key={r.region_id} value={String(r.region_id)}>
                                    {r.region_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by branch"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                    {b.branch_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterOfficerId} onValueChange={setFilterOfficerId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by loan officer"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Loan Officers</SelectItem>
                            {loanOfficers.map((lo) => (
                                <SelectItem key={lo.lo_id} value={String(lo.lo_id)}>
                                    {officerLabel(lo)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group</TableHead>
                                <TableHead>Meeting Day</TableHead>
                                <TableHead>Loan Officer</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 6}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                            <Skeleton className="h-6 w-full"/>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                        No groups found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGroups.map((g) => {
                                    const info = officerInfoById.get(Number(g.lo_id));
                                    const officer = info?.name || "Unknown";
                                    const branch = g.branch_id ? getBranchName(g.branch_id) : "Unknown";
                                    const region = g.region_id ? getRegionName(g.region_id) : "Unknown";

                                    return (
                                        <TableRow key={g.group_id}>
                                            <TableCell className="font-medium">{g.group_name}</TableCell>

                                            <TableCell>
                                                <Badge variant="secondary">{g.meeting_day || "—"}</Badge>
                                            </TableCell>

                                            <TableCell>{officer}</TableCell>
                                            <TableCell>{branch}</TableCell>
                                            <TableCell>{region}</TableCell>

                                            <TableCell className="text-right">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(g)}
                                                    disabled={deleteGroupMutation.isPending}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4"/>
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
