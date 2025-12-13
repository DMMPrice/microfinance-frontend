// src/Component/dashboard/admin/GroupManagement.jsx
import {useState} from "react";
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

import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

export default function GroupManagement() {
    const [open, setOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [meetingDay, setMeetingDay] = useState("");
    const [loanOfficerId, setLoanOfficerId] = useState("");

    const {toast} = useToast();

    const {groups, isLoading, createGroupMutation, deleteGroupMutation} = useGroups();
    const {branches = []} = useBranches();
    const {regions = []} = useRegions();
    const {loanOfficers = []} = useLoanOfficers();

    const getBranchName = (branchId) =>
        branches.find((b) => b.branch_id === branchId)?.branch_name || "Unknown";

    const getRegionName = (regionId) =>
        regions.find((r) => r.region_id === regionId)?.region_name || "Unknown";

    const getOfficerLabel = (lo) => {
        const emp = lo.employee;
        const name = emp?.full_name || `Employee ${lo.employee_id}`;
        const branchName = emp?.branch_id ? getBranchName(emp.branch_id) : "Unknown";
        return `${name} (${branchName})`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const lo = loanOfficers.find((x) => String(x.lo_id) === String(loanOfficerId));
        if (!lo) {
            toast({
                title: "Loan officer not found",
                variant: "destructive",
            });
            return;
        }

        // ✅ From API: loan-officers -> employee -> branch_id/region_id
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
                description:
                    err?.response?.data?.detail || err?.message || "Unexpected error",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (group) => {
        const gid = group.group_id;
        const ok = window.confirm(
            `Delete group "${group.group_name}"?`,
        );
        if (!ok) return;

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

    const getGroupInfo = (group) => {
        const lo = loanOfficers.find((x) => x.lo_id === group.lo_id);
        const emp = lo?.employee;
        return {
            officer: emp?.full_name || "Unknown",
            branch: group.branch_id ? getBranchName(group.branch_id) : "Unknown",
            region: group.region_id ? getRegionName(group.region_id) : "Unknown",
        };
    };

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
                        <Button size="lg" disabled={loanOfficers.length === 0}>
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Group
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
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
                                        {loanOfficers.map((lo) => (
                                            <SelectItem
                                                key={lo.lo_id}
                                                value={String(lo.lo_id)}
                                            >
                                                {getOfficerLabel(lo)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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
                                <Input
                                    value={meetingDay}
                                    onChange={(e) => setMeetingDay(e.target.value)}
                                    placeholder="e.g., Tuesday"
                                    required
                                />
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
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading groups...</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => {
                        const info = getGroupInfo(group);
                        return (
                            <Card key={group.group_id}>
                                <CardHeader>
                                    <CardTitle>{group.group_name}</CardTitle>
                                    <CardDescription>
                                        Meeting Day: {group.meeting_day}
                                        <br/>
                                        Officer: {info.officer}
                                        <br/>
                                        Branch: {info.branch} | Region: {info.region}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(group)}
                                        disabled={deleteGroupMutation.isPending}
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
        </div>
    );
}
