// src/Component/Branches/Expenses/OpeningBalanceDialog.jsx
import React, {useEffect, useMemo} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

import MonthPicker from "@/Utils/MonthPicker";
import {formatToIST} from "@/Helpers/dateTimeIST.js";

import {
    getUserRole,
    getUserRegionId,
    getUserBranchId,
    isRegionalManagerRole,
    isBranchManagerRole,
} from "@/hooks/useApi.js";

export default function OpeningBalanceDialog({
                                                 open,
                                                 onOpenChange,
                                                 mode = "create",
                                                 saving = false,
                                                 form,
                                                 setForm,
                                                 branches = [],
                                                 onSave,
                                             }) {
    const title = mode === "create" ? "Add Opening Balance" : "Edit Opening Balance";

    const role = getUserRole();
    const myRegionId = getUserRegionId();
    const myBranchId = getUserBranchId();

    const isRegionalManager = isRegionalManagerRole(role);
    const isBranchManager = isBranchManagerRole(role);

    const visibleBranches = useMemo(() => {
        if (!Array.isArray(branches)) return [];

        if (isBranchManager) {
            if (myBranchId == null) return [];
            return branches.filter((b) => String(b.branch_id) === String(myBranchId));
        }

        if (isRegionalManager) {
            if (myRegionId == null) return [];
            return branches.filter((b) => String(b.region_id) === String(myRegionId));
        }

        return branches;
    }, [branches, isRegionalManager, isBranchManager, myRegionId, myBranchId]);

    useEffect(() => {
        if (!open) return;
        if (visibleBranches.length === 1) {
            const onlyId = String(visibleBranches[0].branch_id);
            if (String(form?.branch_id || "") !== onlyId) {
                setForm((p) => ({...p, branch_id: onlyId}));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, visibleBranches]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Opening balance is month-to-month. Select a month (it will be saved as the <b>1st day</b> of
                        that month).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Branch */}
                    <div className="space-y-1">
                        <Label>Branch</Label>
                        <Select
                            value={String(form.branch_id || "")}
                            onValueChange={(v) => setForm((p) => ({...p, branch_id: v}))}
                            disabled={isBranchManager}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select branch"/>
                            </SelectTrigger>
                            <SelectContent>
                                {visibleBranches.map((b) => (
                                    <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                        {b.branch_name}
                                    </SelectItem>
                                ))}
                                {visibleBranches.length === 0 ? (
                                    <SelectItem value="__none__" disabled>
                                        {(isBranchManager || isRegionalManager)
                                            ? "No branches available for your access"
                                            : "No branches found"}
                                    </SelectItem>
                                ) : null}
                            </SelectContent>
                        </Select>

                        {isBranchManager ? (
                            <p className="text-xs text-muted-foreground">Branch is locked to your assigned branch.</p>
                        ) : isRegionalManager ? (
                            <p className="text-xs text-muted-foreground">Showing branches only from your region.</p>
                        ) : null}
                    </div>

                    {/* Month (ShadCN basic calendar) */}
                    <div className="space-y-1">
                        <Label>Month</Label>
                        <MonthPicker
                            value={String(form?.seed_date || "")}
                            onChange={(iso) => setForm((p) => ({...p, seed_date: iso}))}
                            placeholder="Pick month"
                        />
                        <p className="text-xs text-muted-foreground">
                            Saved as: {form?.seed_date ? formatToIST(`${String(form.seed_date).slice(0, 10)}T00:00:00`, false) : "-"}
                        </p>
                    </div>

                    {/* Opening Balance */}
                    <div className="space-y-1">
                        <Label>Opening Balance (INR)</Label>
                        <Input
                            type="number"
                            value={form.opening_balance || ""}
                            onChange={(e) => setForm((p) => ({...p, opening_balance: e.target.value}))}
                            placeholder="e.g. 250000"
                        />
                    </div>

                    {/* Remarks */}
                    <div className="space-y-1 md:col-span-2">
                        <Label>Remarks (optional)</Label>
                        <Input
                            value={form.remarks || ""}
                            onChange={(e) => setForm((p) => ({...p, remarks: e.target.value}))}
                            placeholder="Notes / reason"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
