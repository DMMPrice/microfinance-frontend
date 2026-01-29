// src/Component/Groups/CreateGroupDialog.jsx
import React, {useMemo, useState} from "react";
import {Plus} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

import SearchableSelect from "@/Utils/SearchableSelect.jsx";

/**
 * Create Group Dialog
 *
 * Expected loanOfficer objects shape (from useLoanOfficers hook):
 * - lo.lo_id
 * - lo.employee_id
 * - lo.employee: { full_name, branch_id, region_id }
 */
export default function CreateGroupDialog({
    open,
    onOpenChange,
    isLO,
    isBM,
    isRM,
    myBranchId,
    myRegionId,
    eligibleLoanOfficers = [],
    officerLabel,
    createGroupMutation,
    toast,
    days = [],
}) {
    const [groupName, setGroupName] = useState("");
    const [meetingDay, setMeetingDay] = useState("");
    const [loanOfficerId, setLoanOfficerId] = useState("");

    const loanOfficerOptions = useMemo(() => {
        return (eligibleLoanOfficers || []).map((lo) => ({
            value: String(lo.lo_id),
            label: officerLabel?.(lo) || `LO-${lo.lo_id}`,
            keywords: `${lo.employee?.full_name || ""} ${lo.employee_id || ""}`,
        }));
    }, [eligibleLoanOfficers, officerLabel]);

    const meetingDayOptions = useMemo(() => {
        return (days || []).map((d) => ({value: String(d), label: String(d)}));
    }, [days]);

    const resetForm = () => {
        setGroupName("");
        setMeetingDay("");
        setLoanOfficerId("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLO) {
            toast?.({
                title: "Not allowed",
                description: "Loan Officer cannot create groups.",
                variant: "destructive",
            });
            return;
        }

        if (!loanOfficerId) {
            toast?.({title: "Select a loan officer", variant: "destructive"});
            return;
        }
        if (!groupName?.trim()) {
            toast?.({title: "Enter group name", variant: "destructive"});
            return;
        }
        if (!meetingDay) {
            toast?.({title: "Select meeting day", variant: "destructive"});
            return;
        }

        const lo = (eligibleLoanOfficers || []).find(
            (x) => String(x.lo_id) === String(loanOfficerId)
        );

        if (!lo) {
            toast?.({title: "Loan officer not found", variant: "destructive"});
            return;
        }

        const branchId = lo.employee?.branch_id;
        const regionId = lo.employee?.region_id;

        if (!branchId || !regionId) {
            toast?.({
                title: "Missing branch/region",
                description:
                    "Selected loan officer does not have branch_id/region_id in employee.",
                variant: "destructive",
            });
            return;
        }

        // ✅ BM must match branch
        if (isBM && myBranchId != null && String(branchId) !== String(myBranchId)) {
            toast?.({
                title: "Not allowed",
                description: "You can only assign loan officers from your own branch.",
                variant: "destructive",
            });
            return;
        }

        // ✅ RM must match region
        if (isRM && myRegionId != null && String(regionId) !== String(myRegionId)) {
            toast?.({
                title: "Not allowed",
                description: "You can only assign loan officers from your own region.",
                variant: "destructive",
            });
            return;
        }

        try {
            await createGroupMutation.mutateAsync({
                group_name: groupName.trim(),
                lo_id: Number(lo.lo_id),
                region_id: Number(regionId),
                branch_id: Number(branchId),
                meeting_day: meetingDay,
            });

            toast?.({title: "Group created successfully"});
            resetForm();
            onOpenChange?.(false);
        } catch (err) {
            toast?.({
                title: "Failed to create group",
                description: err?.response?.data?.detail || err?.message || "Unexpected error",
                variant: "destructive",
            });
        }
    };

    const disabled =
        !!isLO ||
        (eligibleLoanOfficers || []).length === 0 ||
        !!createGroupMutation?.isPending;

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (isLO) return; // LO can't open
                // If closing, reset form for clean next open
                if (!v) resetForm();
                onOpenChange?.(v);
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="lg"
                    disabled={disabled}
                    title={
                        isLO
                            ? "Loan Officer cannot create groups"
                            : (eligibleLoanOfficers || []).length === 0
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
                        <SearchableSelect
                            value={loanOfficerId}
                            onValueChange={setLoanOfficerId}
                            options={loanOfficerOptions}
                            placeholder="Select loan officer"
                            searchPlaceholder="Search loan officer..."
                            disabled={isLO || (eligibleLoanOfficers || []).length === 0}
                        />
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
                            <SearchableSelect
                                value={meetingDay}
                                onValueChange={setMeetingDay}
                                options={meetingDayOptions}
                                placeholder="Select day"
                                searchPlaceholder="Search day..."
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createGroupMutation?.isPending}>
                        {createGroupMutation?.isPending ? "Creating..." : "Create Group"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
