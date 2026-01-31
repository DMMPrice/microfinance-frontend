// src/Component/Groups/EditGroupDialog.jsx
import React, {useEffect, useMemo, useState} from "react";
import {Pencil} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

import SearchableSelect from "@/Utils/SearchableSelect.jsx";

export default function EditGroupDialog({
  open,
  onOpenChange,
  group, // selected group row
  isLO,
  isBM,
  isRM,
  myBranchId,
  myRegionId,

  eligibleLoanOfficers = [],
  officerLabel,
  days = [],

  updateGroupMutation,
  toast,
}) {
  const [groupName, setGroupName] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [loanOfficerId, setLoanOfficerId] = useState("");

  useEffect(() => {
    if (!open) return;
    setGroupName(group?.group_name ?? "");
    setMeetingDay(group?.meeting_day ?? "");
    setLoanOfficerId(group?.lo_id != null ? String(group.lo_id) : "");
  }, [open, group]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLO) {
      toast?.({
        title: "Not allowed",
        description: "Loan Officer cannot edit groups.",
        variant: "destructive",
      });
      return;
    }

    if (!group?.group_id) {
      toast?.({title: "Missing group id", variant: "destructive"});
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
        description: "Selected loan officer does not have branch_id/region_id.",
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
      await updateGroupMutation.mutateAsync({
        group_id: group.group_id,
        payload: {
          group_name: groupName.trim(),
          meeting_day: meetingDay,
          lo_id: Number(lo.lo_id),
          branch_id: Number(branchId),
          region_id: Number(regionId),
        },
      });

      toast?.({title: "Group updated successfully"});
      onOpenChange?.(false);
    } catch (err) {
      toast?.({
        title: "Failed to update group",
        description: err?.response?.data?.detail || err?.message || "Unexpected error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Group
          </DialogTitle>
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

          <Button
            type="submit"
            className="w-full"
            disabled={updateGroupMutation?.isPending}
          >
            {updateGroupMutation?.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
