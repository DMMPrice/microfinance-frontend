// src/Component/Loan/EditLoanDialog.jsx
import React, {useEffect, useMemo, useState} from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";

function toISODate(v) {
    if (!v) return "";
    // accepts "YYYY-MM-DD" or ISO string
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

function numOrEmpty(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : "";
}

function cleanStatus(v) {
    if (!v) return "";
    return String(v).trim().toUpperCase();
}

/**
 * Props:
 * - open: boolean
 * - onOpenChange: (boolean) => void
 * - row: loan row from /loans/master (must contain loan_id)
 * - onSave: async (loan_id, payload) => void
 * - isSaving: boolean
 *
 * Backend (PUT /loans/{loan_id}) expects:
 *  { loan_account_no?, product_id?, disburse_date?, first_installment_date?,
 *    duration_weeks?, principal_amount?, flat_interest_total?, status? }
 */
export default function EditLoanDialog({
                                           open,
                                           onOpenChange,
                                           row,
                                           onSave,
                                           isSaving = false,
                                       }) {
    const loanId = row?.loan_id ?? row?.id ?? null;

    // derive initial form values from row (master response)
    const initial = useMemo(() => {
        const principal = row?.principal_amount ?? row?.principal ?? "";
        const interest =
            row?.flat_interest_total ??
            row?.interest_amount_total ??
            row?.interest_total ??
            "";

        return {
            loan_account_no: row?.loan_account_no ?? "",
            product_id: row?.product_id ?? "",
            disburse_date: toISODate(row?.disburse_date ?? row?.disbursed_on ?? row?.disbursed_date),
            first_installment_date: toISODate(row?.first_installment_date ?? row?.first_due_date),
            duration_weeks: row?.duration_weeks ?? "",
            principal_amount: principal,
            flat_interest_total: interest,
            status: cleanStatus(row?.status ?? ""),
        };
    }, [row]);

    const [loanAccountNo, setLoanAccountNo] = useState("");
    const [productId, setProductId] = useState("");
    const [disburseDate, setDisburseDate] = useState("");
    const [firstInstDate, setFirstInstDate] = useState("");
    const [durationWeeks, setDurationWeeks] = useState("");
    const [principalAmount, setPrincipalAmount] = useState("");
    const [flatInterestTotal, setFlatInterestTotal] = useState("");
    const [status, setStatus] = useState("");

    const [dirty, setDirty] = useState(false);

    // reset form when opening / row changes
    useEffect(() => {
        if (!open) return;
        setLoanAccountNo(initial.loan_account_no);
        setProductId(numOrEmpty(initial.product_id));
        setDisburseDate(initial.disburse_date);
        setFirstInstDate(initial.first_installment_date);
        setDurationWeeks(numOrEmpty(initial.duration_weeks));
        setPrincipalAmount(numOrEmpty(initial.principal_amount));
        setFlatInterestTotal(numOrEmpty(initial.flat_interest_total));
        setStatus(initial.status || "");
        setDirty(false);
    }, [open, initial]);

    const payload = useMemo(() => {
        // only send fields that changed (PATCH-like behavior over PUT)
        const out = {};

        const pushIfChanged = (key, next, prev) => {
            const n = next === "" ? "" : next;
            const p = prev === "" ? "" : prev;
            if (String(n ?? "") !== String(p ?? "")) out[key] = next;
        };

        pushIfChanged("loan_account_no", loanAccountNo?.trim(), initial.loan_account_no);

        // numbers
        pushIfChanged("product_id", productId !== "" ? Number(productId) : "", initial.product_id !== "" ? Number(initial.product_id) : "");
        pushIfChanged("duration_weeks", durationWeeks !== "" ? Number(durationWeeks) : "", initial.duration_weeks !== "" ? Number(initial.duration_weeks) : "");

        // dates as YYYY-MM-DD
        pushIfChanged("disburse_date", disburseDate || "", initial.disburse_date || "");
        pushIfChanged("first_installment_date", firstInstDate || "", initial.first_installment_date || "");

        // decimals
        pushIfChanged("principal_amount", principalAmount !== "" ? Number(principalAmount) : "", initial.principal_amount !== "" ? Number(initial.principal_amount) : "");
        pushIfChanged("flat_interest_total", flatInterestTotal !== "" ? Number(flatInterestTotal) : "", initial.flat_interest_total !== "" ? Number(initial.flat_interest_total) : "");

        // status
        pushIfChanged("status", status ? status.toUpperCase() : "", initial.status || "");

        // remove empty-string values so backend sees "not provided"
        Object.keys(out).forEach((k) => {
            if (out[k] === "") delete out[k];
            if (Number.isNaN(out[k])) delete out[k];
        });

        return out;
    }, [
        loanAccountNo,
        productId,
        disburseDate,
        firstInstDate,
        durationWeeks,
        principalAmount,
        flatInterestTotal,
        status,
        initial,
    ]);

    const hasChanges = Object.keys(payload).length > 0;

    const warnings = useMemo(() => {
        const w = [];
        if (!loanId) w.push("Missing loan_id (cannot update).");
        if (principalAmount !== "" && Number(principalAmount) < 0) w.push("Principal cannot be negative.");
        if (flatInterestTotal !== "" && Number(flatInterestTotal) < 0) w.push("Interest cannot be negative.");
        if (durationWeeks !== "" && Number(durationWeeks) <= 0) w.push("Duration weeks must be > 0.");
        return w;
    }, [loanId, principalAmount, flatInterestTotal, durationWeeks]);

    const disableSave = isSaving || !loanId || !hasChanges || warnings.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Loan</DialogTitle>
                    <DialogDescription>
                        Update loan details. If payments already exist, backend will allow only limited safe fields.
                    </DialogDescription>
                </DialogHeader>

                {warnings.length > 0 ? (
                    <Alert variant="destructive" className="mb-2">
                        <AlertTitle>Fix these before saving</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 space-y-1">
                                {warnings.map((x, i) => (
                                    <li key={i}>{x}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loan Account No */}
                    <div className="space-y-1">
                        <Label>Loan Account No</Label>
                        <Input
                            value={loanAccountNo}
                            onChange={(e) => {
                                setLoanAccountNo(e.target.value);
                                setDirty(true);
                            }}
                            placeholder="e.g. LN-1001"
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <Label>Status</Label>
                        <Select
                            value={status || ""}
                            onValueChange={(v) => {
                                setStatus(v);
                                setDirty(true);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status"/>
                            </SelectTrigger>
                            <SelectContent>
                                {["DISBURSED", "ACTIVE", "CLOSED", "CANCELLED"].map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Product ID */}
                    <div className="space-y-1">
                        <Label>Product ID</Label>
                        <Input
                            type="number"
                            value={productId}
                            onChange={(e) => {
                                setProductId(e.target.value);
                                setDirty(true);
                            }}
                            placeholder="e.g. 1"
                        />
                    </div>

                    {/* Duration Weeks */}
                    <div className="space-y-1">
                        <Label>Duration (Weeks)</Label>
                        <Input
                            type="number"
                            value={durationWeeks}
                            onChange={(e) => {
                                setDurationWeeks(e.target.value);
                                setDirty(true);
                            }}
                            placeholder="e.g. 20"
                        />
                    </div>

                    {/* Disburse Date */}
                    <div className="space-y-1">
                        <Label>Disburse Date</Label>
                        <Input
                            type="date"
                            value={disburseDate}
                            onChange={(e) => {
                                setDisburseDate(e.target.value);
                                setDirty(true);
                            }}
                        />
                    </div>

                    {/* First Installment Date */}
                    <div className="space-y-1">
                        <Label>First Installment Date</Label>
                        <Input
                            type="date"
                            value={firstInstDate}
                            onChange={(e) => {
                                setFirstInstDate(e.target.value);
                                setDirty(true);
                            }}
                        />
                    </div>

                    {/* Principal */}
                    <div className="space-y-1">
                        <Label>Principal Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={principalAmount}
                            onChange={(e) => {
                                setPrincipalAmount(e.target.value);
                                setDirty(true);
                            }}
                            placeholder="e.g. 10000"
                        />
                    </div>

                    {/* Flat Interest Total */}
                    <div className="space-y-1">
                        <Label>Flat Interest Total</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={flatInterestTotal}
                            onChange={(e) => {
                                setFlatInterestTotal(e.target.value);
                                setDirty(true);
                            }}
                            placeholder="e.g. 2000"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground mt-3">
                    Loan ID: <span className="font-medium text-foreground">{loanId ?? "-"}</span>
                    {dirty ? <span className="ml-2">• Unsaved changes</span> : null}
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={async () => {
                            if (!loanId) return;
                            await onSave?.(loanId, payload);
                        }}
                        disabled={disableSave}
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
