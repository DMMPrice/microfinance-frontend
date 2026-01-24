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
import {Skeleton} from "@/components/ui/skeleton";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";

import {apiClient} from "@/hooks/useApi.js";

function numOrEmpty(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : "";
}

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n) {
    return `₹${safeNum(n).toFixed(2)}`;
}

function cleanStatus(v) {
    if (!v) return "";
    return String(v).trim().toUpperCase();
}

function safeText(v) {
    if (v === null || v === undefined) return "-";
    const s = String(v).trim();
    return s || "-";
}

function extractApiError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    if (!err?.response) {
        return {title: "Network error", description: err?.message || "Unable to reach server."};
    }

    const detail = data?.detail ?? data;

    if (status === 422 && Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        const loc = Array.isArray(first?.loc) ? first.loc.join(" → ") : "Validation";
        const msg = first?.msg || "Invalid input";
        return {title: "Validation error", description: `${loc}: ${msg}`};
    }

    if (typeof detail === "string") {
        return {title: "Request failed", description: detail};
    }

    if (detail && typeof detail === "object") {
        return {title: "Request failed", description: JSON.stringify(detail)};
    }

    return {title: "Request failed", description: err?.message || "Something went wrong."};
}

/**
 * Props:
 * - open: boolean
 * - onOpenChange: (boolean) => void
 * - row: loan row from /loans/master (must contain loan_id)
 * - onSave: async (loan_id, payload) => void
 * - isSaving: boolean
 *
 * ✅ Only principal is editable.
 * ✅ Show summary info from GET /loans/{loan_id}/summary to understand the loan.
 */
export default function EditLoanDialog({
                                           open,
                                           onOpenChange,
                                           row,
                                           onSave,
                                           isSaving = false,
                                       }) {
    const loanId = row?.loan_id ?? row?.id ?? null;

    const initialPrincipal = useMemo(() => {
        const principal = row?.principal_amount ?? row?.principal ?? "";
        return principal;
    }, [row]);

    const [principalAmount, setPrincipalAmount] = useState("");
    const [dirty, setDirty] = useState(false);

    // ✅ Summary state
    const [summary, setSummary] = useState(null);
    const [sumLoading, setSumLoading] = useState(false);
    const [sumErr, setSumErr] = useState("");

    // reset form when opening / row changes
    useEffect(() => {
        if (!open) return;
        setPrincipalAmount(numOrEmpty(initialPrincipal));
        setDirty(false);
    }, [open, initialPrincipal]);

    // ✅ load summary when dialog opens
    useEffect(() => {
        if (!open) return;
        if (!loanId) return;

        let cancelled = false;

        (async () => {
            setSumLoading(true);
            setSumErr("");
            try {
                const res = await apiClient.get(`/loans/${loanId}/summary`);
                if (!cancelled) setSummary(res?.data || null);
            } catch (e) {
                const {description} = extractApiError(e);
                if (!cancelled) setSumErr(description || "Failed to load loan summary");
            } finally {
                if (!cancelled) setSumLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, loanId]);

    const payload = useMemo(() => {
        const out = {};
        const next = principalAmount !== "" ? Number(principalAmount) : "";
        const prev = initialPrincipal !== "" ? Number(initialPrincipal) : "";

        if (principalAmount !== "" && String(next) !== String(prev)) {
            out.principal_amount = next;
        }

        Object.keys(out).forEach((k) => {
            if (out[k] === "") delete out[k];
            if (Number.isNaN(out[k])) delete out[k];
        });

        return out;
    }, [principalAmount, initialPrincipal]);

    const hasChanges = Object.keys(payload).length > 0;

    const warnings = useMemo(() => {
        const w = [];
        if (!loanId) w.push("Missing loan_id (cannot update).");
        if (principalAmount === "") w.push("Principal is required.");
        if (principalAmount !== "" && Number(principalAmount) <= 0) w.push("Principal must be > 0.");
        return w;
    }, [loanId, principalAmount]);

    const disableSave = isSaving || !loanId || !hasChanges || warnings.length > 0;

    // ✅ A tiny “impact” hint computed from summary (best-effort, no backend assumptions)
    const impactHint = useMemo(() => {
        if (!summary) return null;

        const oldPrincipal = safeNum(summary.principal_amount ?? initialPrincipal);
        const newPrincipal = safeNum(principalAmount);

        if (!hasChanges) return null;
        if (!oldPrincipal || !newPrincipal) return null;

        const delta = newPrincipal - oldPrincipal;
        const sign = delta >= 0 ? "+" : "-";
        return {
            oldPrincipal,
            newPrincipal,
            delta,
            text: `${sign}${fmtMoney(Math.abs(delta)).replace(".00", "")} change in principal`,
        };
    }, [summary, initialPrincipal, principalAmount, hasChanges]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Loan</DialogTitle>
                    <DialogDescription>
                        You can change only the <b>Principal Amount</b>. Loan details below are for reference.
                    </DialogDescription>
                </DialogHeader>

                {/* ✅ Summary card */}
                <div className="rounded-xl border bg-muted/20 p-3">
                    {sumLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <Skeleton className="h-14 w-full"/>
                            <Skeleton className="h-14 w-full"/>
                            <Skeleton className="h-14 w-full"/>
                            <Skeleton className="h-14 w-full"/>
                            <Skeleton className="h-14 w-full"/>
                            <Skeleton className="h-14 w-full"/>
                        </div>
                    ) : sumErr ? (
                        <div className="text-sm text-destructive">{sumErr}</div>
                    ) : summary ? (
                        <>
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                <div className="text-sm font-medium">
                                    {safeText(summary.loan_account_no)} • {safeText(summary.member_name)}
                                </div>
                                <Badge variant="secondary">{cleanStatus(summary.status) || "-"}</Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Group</div>
                                    <div className="text-sm font-medium">{safeText(summary.group_name)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Principal</div>
                                    <div className="text-sm font-medium">{fmtMoney(summary.principal_amount)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Interest Total</div>
                                    <div className="text-sm font-medium">{fmtMoney(summary.interest_amount_total)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Total Disbursed</div>
                                    <div
                                        className="text-sm font-medium">{fmtMoney(summary.total_disbursed_amount)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Outstanding</div>
                                    <div className="text-sm font-medium">{fmtMoney(summary.outstanding)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Next Due</div>
                                    <div className="text-sm font-medium">
                                        {safeText(summary.next_due_date)} • {fmtMoney(summary.next_due_amount)}
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2 sm:col-span-2 lg:col-span-3">
                                    <div className="text-[11px] text-muted-foreground">Charges</div>
                                    <div className="text-sm font-medium">
                                        Total {fmtMoney(summary.charges_total)} •
                                        Pending {fmtMoney(summary.charges_pending)} •
                                        Collected {fmtMoney(summary.charges_collected)}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-muted-foreground">No summary available.</div>
                    )}
                </div>

                {warnings.length > 0 ? (
                    <Alert variant="destructive" className="mt-3">
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

                {/* ✅ Only editable field */}
                <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label>Principal Amount</Label>
                        {impactHint ? (
                            <Badge variant="outline">{impactHint.text}</Badge>
                        ) : null}
                    </div>

                    <Input
                        type="number"
                        step="0.01"
                        value={principalAmount}
                        onChange={(e) => {
                            setPrincipalAmount(e.target.value);
                            setDirty(true);
                        }}
                        placeholder="e.g. 14000"
                    />

                    <div className="text-xs text-muted-foreground">
                        After saving, the loan summary and schedule will refresh automatically.
                    </div>
                </div>

                <div className="text-xs text-muted-foreground mt-3">
                    {dirty ? <span>• Unsaved changes</span> : null}
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
