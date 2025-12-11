// src/Component/dashboard/admin/GroupManagement.jsx
import {useState, useMemo} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Plus, Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

// 🔹 hooks
import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

// 🔹 auth helper – to know current role + userId
import {getUserCtx} from "@/lib/http.js";

export default function GroupManagement() {
    const [open, setOpen] = useState(false); // create dialog
    const [editOpen, setEditOpen] = useState(false); // edit dialog
    const [groupName, setGroupName] = useState("");
    const [meetingDay, setMeetingDay] = useState("");
    const [loanOfficerId, setLoanOfficerId] = useState("");

    // edit state
    const [editGroup, setEditGroup] = useState(null);
    const [editLoanOfficerId, setEditLoanOfficerId] = useState("");

    const {toast} = useToast();

    const {
        groups,
        isLoading,
        isError,
        createGroupMutation,
        deleteGroupMutation,
        assignLoanOfficerMutation,
    } = useGroups();

    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {loanOfficers = []} = useLoanOfficers();

    // 🔹 Current user context (role, userId, etc.)
    const userCtx = useMemo(() => getUserCtx(), []);
    const currentRole = (userCtx?.role || "").toLowerCase();
    const currentUserId = userCtx?.userId;
    const isLoanOfficerRole = currentRole === "loan_officer";

    // 🔹 For Loan Officer role, find *their* own LO record
    const currentLoanOfficer = useMemo(() => {
        if (!isLoanOfficerRole || !currentUserId) return null;
        return (
            loanOfficers.find((o) => {
                const idValue = o.lo_id ?? o.id;
                return Number(idValue) === Number(currentUserId);
            }) || null
        );
    }, [isLoanOfficerRole, currentUserId, loanOfficers]);

    const resetForm = () => {
        setGroupName("");
        setMeetingDay("");
        setLoanOfficerId("");
    };

    // ------------------------------------------------
    // CREATE GROUP
    // ------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        let selectedOfficer = null;
        let loIdNumber;

        if (isLoanOfficerRole) {
            loIdNumber = Number(currentUserId);
            selectedOfficer = currentLoanOfficer;
        } else {
            const officer = loanOfficers.find((o) => {
                const idValue = o.lo_id ?? o.id;
                return String(idValue) === loanOfficerId;
            });
            selectedOfficer = officer || null;
            loIdNumber = Number(loanOfficerId);
        }

        if (!selectedOfficer || !loIdNumber) {
            toast({
                title: "Loan officer not found",
                description: "Please select a valid loan officer.",
                variant: "destructive",
            });
            return;
        }

        const branchId = selectedOfficer.branch_id ?? selectedOfficer.branchId;
        const regionId = selectedOfficer.region_id ?? selectedOfficer.regionId;

        if (!branchId || !regionId) {
            toast({
                title: "Missing branch/region",
                description:
                    "Selected loan officer does not have branch/region set.",
                variant: "destructive",
            });
            return;
        }

        try {
            await createGroupMutation.mutateAsync({
                group_name: groupName,
                lo_id: loIdNumber,
                branch_id: branchId,
                region_id: regionId,
                meeting_day: meetingDay || null,
            });

            toast({title: "Group created successfully"});
            resetForm();
            setOpen(false);
        } catch (err) {
            toast({
                title: "Failed to create group",
                description:
                    err?.response?.data?.detail ||
                    err.message ||
                    "Unexpected error",
                variant: "destructive",
            });
        }
    };

    // ------------------------------------------------
    // DELETE GROUP
    // ------------------------------------------------
    const handleDelete = async (group) => {
        const id = group.group_id ?? group.id;

        const ok = window.confirm(
            `Are you sure you want to delete group "${group.group_name || group.name}"?`,
        );
        if (!ok) return;

        try {
            await deleteGroupMutation.mutateAsync(id);
            toast({title: "Group deleted"});
        } catch (err) {
            toast({
                title: "Failed to delete group",
                description:
                    err?.response?.data?.detail ||
                    err.message ||
                    "Unexpected error",
                variant: "destructive",
            });
        }
    };

    // ------------------------------------------------
    // EDIT GROUP → reassign Loan Officer
    // ------------------------------------------------
    const openEditDialog = (group) => {
        setEditGroup(group);
        const currentLoId = group.lo_id ?? group.loanOfficerId ?? "";
        setEditLoanOfficerId(currentLoId ? String(currentLoId) : "");
        setEditOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editGroup) return;

        const groupId = editGroup.group_id ?? editGroup.id;
        const newLoId = Number(editLoanOfficerId);

        if (!newLoId) {
            toast({
                title: "Loan officer not selected",
                description: "Please choose a loan officer.",
                variant: "destructive",
            });
            return;
        }

        try {
            await assignLoanOfficerMutation.mutateAsync({
                lo_id: newLoId,
                group_ids: [groupId],
            });

            toast({title: "Group updated successfully"});
            setEditOpen(false);
            setEditGroup(null);
        } catch (err) {
            toast({
                title: "Failed to update group",
                description:
                    err?.response?.data?.detail ||
                    err.message ||
                    "Unexpected error",
                variant: "destructive",
            });
        }
    };

    const getGroupInfo = (group) => {
        const loId = group.lo_id ?? group.loanOfficerId;
        const branchId = group.branch_id ?? group.branchId;
        const regionId = group.region_id ?? group.regionId;

        const officer = loanOfficers.find((o) => {
            const idValue = o.lo_id ?? o.id;
            return Number(idValue) === Number(loId);
        });

        const branch = branches.find(
            (b) => b.branch_id === branchId || b.id === branchId,
        );

        const region = regions.find(
            (r) => r.region_id === regionId || r.id === regionId,
        );

        const officerName =
            officer?.name ||
            officer?.full_name ||
            (officer
                ? `${officer.first_name || ""} ${
                    officer.last_name || ""
                }`.trim()
                : null);

        return {
            officer: officerName || "Unknown",
            branch: branch?.branch_name || branch?.name || "Unknown",
            region: region?.region_name || region?.name || "Unknown",
        };
    };

    // 🔹 Helper: computed display name for current LO (for LO role)
    const currentLoanOfficerLabel = useMemo(() => {
        if (!currentLoanOfficer) return "";
        const officer = currentLoanOfficer;
        const branchId = officer.branch_id ?? officer.branchId;
        const branch = branches.find(
            (b) => b.branch_id === branchId || b.id === branchId,
        );
        const officerName =
            officer.name ||
            officer.full_name ||
            `${officer.first_name || ""} ${
                officer.last_name || ""
            }`.trim();
        return `${officerName} (${
            branch?.branch_name || branch?.name || "Unknown"
        })`;
    }, [currentLoanOfficer, branches]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Group Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage borrower groups
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            disabled={
                                loanOfficers.length === 0 ||
                                createGroupMutation.isPending
                            }
                        >
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Loan Officer */}
                            <div className="space-y-2">
                                <Label htmlFor="officer">
                                    Assign to Loan Officer
                                </Label>

                                {isLoanOfficerRole ? (
                                    <div className="rounded-md border px-3 py-2 text-sm bg-muted">
                                        {currentLoanOfficerLabel ||
                                            "Your loan officer profile"}
                                    </div>
                                ) : (
                                    <Select
                                        value={loanOfficerId}
                                        onValueChange={setLoanOfficerId}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select loan officer"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loanOfficers.map((officer) => {
                                                const idValue =
                                                    officer.lo_id ??
                                                    officer.id;
                                                const branchId =
                                                    officer.branch_id ??
                                                    officer.branchId;
                                                const branch = branches.find(
                                                    (b) =>
                                                        b.branch_id ===
                                                        branchId ||
                                                        b.id === branchId,
                                                );

                                                const officerName =
                                                    officer.name ||
                                                    officer.full_name ||
                                                    `${officer.first_name ||
                                                    ""} ${
                                                        officer.last_name ||
                                                        ""
                                                    }`.trim();

                                                return (
                                                    <SelectItem
                                                        key={idValue}
                                                        value={String(idValue)}
                                                    >
                                                        {officerName} (
                                                        {branch?.branch_name ||
                                                            branch?.name ||
                                                            "Unknown"}
                                                        )
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Group Name */}
                            <div className="space-y-2">
                                <Label htmlFor="groupName">Group Name</Label>
                                <Input
                                    id="groupName"
                                    value={groupName}
                                    onChange={(e) =>
                                        setGroupName(e.target.value)
                                    }
                                    placeholder="e.g., Group A"
                                    required
                                />
                            </div>

                            {/* Meeting Day (optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="meetingDay">Meeting Day</Label>
                                <Input
                                    id="meetingDay"
                                    value={meetingDay}
                                    onChange={(e) =>
                                        setMeetingDay(e.target.value)
                                    }
                                    placeholder="e.g., Monday"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={createGroupMutation.isPending}
                            >
                                {createGroupMutation.isPending
                                    ? "Creating..."
                                    : "Create Group"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* EDIT dialog – reassign LO */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Edit Group –{" "}
                            {editGroup?.group_name || editGroup?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Loan Officer</Label>
                            <Select
                                value={editLoanOfficerId}
                                onValueChange={setEditLoanOfficerId}
                                required
                                disabled={isLoanOfficerRole} // LO can't reassign
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select loan officer"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {loanOfficers.map((officer) => {
                                        const idValue =
                                            officer.lo_id ?? officer.id;
                                        const branchId =
                                            officer.branch_id ??
                                            officer.branchId;
                                        const branch = branches.find(
                                            (b) =>
                                                b.branch_id === branchId ||
                                                b.id === branchId,
                                        );

                                        const officerName =
                                            officer.name ||
                                            officer.full_name ||
                                            `${officer.first_name || ""} ${
                                                officer.last_name || ""
                                            }`.trim();

                                        return (
                                            <SelectItem
                                                key={idValue}
                                                value={String(idValue)}
                                            >
                                                {officerName} (
                                                {branch?.branch_name ||
                                                    branch?.name ||
                                                    "Unknown"}
                                                )
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={assignLoanOfficerMutation.isPending}
                        >
                            {assignLoanOfficerMutation.isPending
                                ? "Saving..."
                                : "Save Changes"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Groups list */}
            {isLoading && (
                <p className="text-sm text-muted-foreground">
                    Loading groups...
                </p>
            )}

            {isError && (
                <p className="text-sm text-destructive">
                    Failed to load groups
                </p>
            )}

            {!isLoading && groups.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => {
                        const id = group.group_id ?? group.id;
                        const name = group.group_name ?? group.name;
                        const info = getGroupInfo(group);

                        return (
                            <Card key={id}>
                                <CardHeader>
                                    <CardTitle>{name}</CardTitle>
                                    <CardDescription>
                                        {group.meeting_day && (
                                            <>
                                                Meeting Day:{" "}
                                                {group.meeting_day}
                                                <br/>
                                            </>
                                        )}
                                        Officer: {info.officer}
                                        <br/>
                                        Branch: {info.branch} | Region:{" "}
                                        {info.region}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex gap-2">
                                    {/* 🔹 Edit button – hidden for Loan Officer role */}
                                    {!isLoanOfficerRole && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditDialog(group)}
                                            disabled={
                                                assignLoanOfficerMutation.isPending
                                            }
                                        >
                                            Edit
                                        </Button>
                                    )}

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(group)}
                                        disabled={
                                            deleteGroupMutation.isPending
                                        }
                                    >
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Delete
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!isLoading && groups.length === 0 && loanOfficers.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground mb-4">
                            No groups created yet
                        </p>
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create First Group
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loanOfficers.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create loan officers first to add groups
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
