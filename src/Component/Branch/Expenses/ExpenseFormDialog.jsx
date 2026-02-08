// src/Component/Branches/Expenses/ExpenseFormDialog.jsx
import React, {useEffect, useMemo} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

import SimpleDatePicker from "@/Utils/SimpleDatePicker"; // ✅ NEW

import {
    getUserRole,
    getUserRegionId,
    getUserBranchId,
    isRegionalManagerRole,
    isBranchManagerRole,
} from "@/hooks/useApi.js";

export function ExpenseFormDialog({
                                      open,
                                      onOpenChange,
                                      mode = "create",
                                      saving = false,
                                      form,
                                      setForm,
                                      branches = [],
                                      categories = [],
                                      subcategories = [],
                                      onSave,
                                  }) {
    const title = mode === "create" ? "Add Expense" : "Edit Expense";

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

    const filteredSubcats = useMemo(() => {
        if (!form?.category_id) return [];
        return subcategories.filter((s) => String(s.category_id) === String(form.category_id));
    }, [subcategories, form?.category_id]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Fill in details and save.</DialogDescription>
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
                            <SelectTrigger><SelectValue placeholder="Select branch"/></SelectTrigger>
                            <SelectContent>
                                {visibleBranches.map((b) => (
                                    <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                        {b.branch_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <Label>Category</Label>
                        <Select
                            value={String(form.category_id || "")}
                            onValueChange={(v) =>
                                setForm((p) => ({
                                    ...p,
                                    category_id: v,
                                    subcategory_id: "",
                                }))
                            }
                        >
                            <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c.category_id} value={String(c.category_id)}>
                                        {c.category_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subcategory */}
                    <div className="space-y-1">
                        <Label>Subcategory</Label>
                        <Select
                            value={String(form.subcategory_id || "")}
                            onValueChange={(v) => setForm((p) => ({...p, subcategory_id: v}))}
                            disabled={!form.category_id}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={form.category_id ? "Select subcategory" : "Select category first"}/>
                            </SelectTrigger>
                            <SelectContent>
                                {filteredSubcats.length === 0 ? (
                                    <SelectItem value="__none__" disabled>No subcategories found</SelectItem>
                                ) : (
                                    filteredSubcats.map((s) => (
                                        <SelectItem key={s.subcategory_id} value={String(s.subcategory_id)}>
                                            {s.subcategory_name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ✅ Expense Date (ShadCN calendar, IST display) */}
                    <div className="space-y-1">
                        <Label>Expense Date</Label>
                        <SimpleDatePicker
                            value={form.expense_date || ""}
                            onChange={(iso) => setForm((p) => ({...p, expense_date: iso}))}
                            placeholder="Pick date"
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <Label>Amount (INR)</Label>
                        <Input
                            type="number"
                            value={form.amount || ""}
                            onChange={(e) => setForm((p) => ({...p, amount: e.target.value}))}
                            placeholder="e.g. 1200"
                        />
                    </div>

                    {/* Reference */}
                    <div className="space-y-1 md:col-span-2">
                        <Label>Reference No (optional)</Label>
                        <Input
                            value={form.reference_no || ""}
                            onChange={(e) => setForm((p) => ({...p, reference_no: e.target.value}))}
                            placeholder="Bill/Invoice/Ref number"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1 md:col-span-2">
                        <Label>Description (optional)</Label>
                        <Input
                            value={form.description || ""}
                            onChange={(e) => setForm((p) => ({...p, description: e.target.value}))}
                            placeholder="Description of expense"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
