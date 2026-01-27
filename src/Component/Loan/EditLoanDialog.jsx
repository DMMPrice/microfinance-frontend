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
import {toast} from "@/components/ui/use-toast";

import {apiClient} from "@/hooks/useApi.js";
import {useLoanSummary, useLoanCharges} from "@/hooks/useLoans";

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// Defaults if /settings missing
const DEFAULT_PROCESSING_PCT = 1;
const DEFAULT_INSURANCE_PCT = 0.5;
const DEFAULT_BOOK_PRICE = 0;

export default function EditLoanDialog({
                                           open,
                                           onOpenChange,
                                           row,
                                           onSave,
                                           isSaving = false,
                                       }) {
    const loanId = row?.loan_id ?? row?.id ?? null;
    const loanAccountNo = row?.loan_account_no ?? "";

    // Fetch latest summary + charges (so UI is accurate even if table row is stale)
    const summaryQ = useLoanSummary(loanId);
    const chargesQ = useLoanCharges(loanId);

    // Settings (for charge preview when principal changes)
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [procPct, setProcPct] = useState(DEFAULT_PROCESSING_PCT);
    const [insPct, setInsPct] = useState(DEFAULT_INSURANCE_PCT);
    const [bookAmt, setBookAmt] = useState(DEFAULT_BOOK_PRICE);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        (async () => {
            setSettingsLoading(true);
            try {
                const res = await apiClient.get("/settings");
                const list = Array.isArray(res.data) ? res.data : [];
                const getVal = (key) => list.find((x) => x?.key === key)?.value;

                const p = Number(getVal("PROCESSING_FEES") ?? DEFAULT_PROCESSING_PCT);
                const i = Number(getVal("INSURANCE_FEES") ?? DEFAULT_INSURANCE_PCT);
                const b = Number(getVal("BOOK_PRICE") ?? DEFAULT_BOOK_PRICE);

                if (!cancelled) {
                    setProcPct(Number.isFinite(p) ? p : DEFAULT_PROCESSING_PCT);
                    setInsPct(Number.isFinite(i) ? i : DEFAULT_INSURANCE_PCT);
                    setBookAmt(Number.isFinite(b) ? b : DEFAULT_BOOK_PRICE);
                }
            } catch {
                // silent fallback
            } finally {
                if (!cancelled) setSettingsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // Principal input
    const initialPrincipal = useMemo(() => {
        // prefer summary if available
        const s = summaryQ.data;
        if (s?.principal_amount != null) return String(s.principal_amount);
        if (row?.principal_amount != null) return String(row.principal_amount);
        if (row?.principal != null) return String(row.principal);
        return "";
    }, [summaryQ.data, row]);

    const [principalDraft, setPrincipalDraft] = useState("");

    useEffect(() => {
        if (!open) return;
        setPrincipalDraft(initialPrincipal || "");
    }, [open, initialPrincipal]);

    const principalChanged = useMemo(() => {
        if (principalDraft === "" || initialPrincipal === "") return false;
        return safeNum(principalDraft) !== safeNum(initialPrincipal);
    }, [principalDraft, initialPrincipal]);

    const payload = useMemo(() => {
        const out = {};
        if (principalDraft !== "" && safeNum(principalDraft) !== safeNum(initialPrincipal)) {
            out.principal_amount = safeNum(principalDraft);
        }
        return out;
    }, [principalDraft, initialPrincipal]);

    const disableSave =
        isSaving ||
        !loanId ||
        Object.keys(payload).length === 0 ||
        safeNum(principalDraft) <= 0;

    // Existing charges
    const charges = useMemo(() => (Array.isArray(chargesQ.data) ? chargesQ.data : []), [chargesQ.data]);

    const currentChargesTotal = useMemo(() => {
        return charges.reduce((sum, c) => sum + safeNum(c.amount), 0);
    }, [charges]);

    // Preview charges if principal changes (based on settings)
    const previewProcessing = useMemo(() => {
        return (safeNum(principalDraft) * safeNum(procPct)) / 100;
    }, [principalDraft, procPct]);

    const previewInsurance = useMemo(() => {
        return (safeNum(principalDraft) * safeNum(insPct)) / 100;
    }, [principalDraft, insPct]);

    const previewTotalCharges = useMemo(() => {
        return safeNum(previewProcessing) + safeNum(previewInsurance) + safeNum(bookAmt);
    }, [previewProcessing, previewInsurance, bookAmt]);

    const summary = summaryQ.data;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Edit Loan</DialogTitle>
                    <DialogDescription>
                        Only <b>Principal Amount</b> can be changed here. If principal changes, backend will recalculate
                        installments and related totals.
                    </DialogDescription>
                </DialogHeader>

                {!loanId ? (
                    <Alert variant="destructive" className="mb-2">
                        <AlertTitle>Missing loan_id</AlertTitle>
                        <AlertDescription>Cannot update this loan because loan_id is missing in the selected
                            row.</AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Edit */}
                    <div className="rounded-xl border p-4 space-y-3">
                        <div>
                            <div className="text-sm text-muted-foreground">Loan A/C No</div>
                            <div
                                className="text-base font-semibold">{summary?.loan_account_no || loanAccountNo || "-"}</div>
                            <div className="text-sm text-muted-foreground">
                                {summary?.member_name ? `${summary.member_name} • ${summary.group_name}` : ""}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Principal Amount</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={principalDraft}
                                onChange={(e) => setPrincipalDraft(e.target.value)}
                                placeholder="e.g. 14000"
                            />
                            <div className="text-xs text-muted-foreground">
                                Current principal: <span
                                className="font-medium text-foreground">{money(initialPrincipal)}</span>
                                {principalChanged ? (
                                    <span className="ml-2 text-amber-600">• Will recalculate schedule</span>
                                ) : null}
                            </div>
                        </div>

                        {principalChanged ? (
                            <Alert className="mt-2">
                                <AlertTitle>Impact Preview</AlertTitle>
                                <AlertDescription className="space-y-2">
                                    <div className="text-sm">
                                        Your backend should recompute totals when principal changes.
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-muted-foreground">Processing ({procPct}%)
                                            </div>
                                            <div className="text-sm font-semibold">
                                                {settingsLoading ? "…" : `₹${money(previewProcessing)}`}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-muted-foreground">Insurance ({insPct}%)
                                            </div>
                                            <div className="text-sm font-semibold">
                                                {settingsLoading ? "…" : `₹${money(previewInsurance)}`}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border p-2">
                                            <div className="text-[11px] text-muted-foreground">Book Price</div>
                                            <div className="text-sm font-semibold">₹{money(bookAmt)}</div>
                                        </div>
                                    </div>

                                    <div className="text-sm">
                                        New expected charges total: <b>₹{money(previewTotalCharges)}</b>
                                        {" "} (current: ₹{money(currentChargesTotal)})
                                    </div>
                                </AlertDescription>
                            </Alert>
                        ) : null}
                    </div>

                    {/* Right: Summary + Charges */}
                    <div className="rounded-xl border p-4 space-y-3">
                        <div className="text-sm font-semibold">Current Summary</div>

                        {summaryQ.isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-2/3"/>
                                <Skeleton className="h-20 w-full"/>
                            </div>
                        ) : summaryQ.isError ? (
                            <div className="text-sm text-destructive">
                                {summaryQ.error?.response?.data?.detail || summaryQ.error?.message || "Failed to load summary"}
                            </div>
                        ) : summary ? (
                            <div className="grid grid-cols-2 gap-2">
                                <MiniK title="Principal" value={money(summary.principal_amount)}/>
                                <MiniK title="Interest Total" value={money(summary.interest_amount_total)}/>
                                <MiniK title="Total Disbursed" value={money(summary.total_disbursed_amount)}/>
                                <MiniK title="Outstanding" value={money(summary.outstanding)}/>
                                <MiniK title="Status" value={String(summary.status || "-")}/>
                                <MiniK title="Next Due" value={summary.next_due_date || "-"}/>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No summary loaded.</div>
                        )}

                        <div className="text-sm font-semibold pt-2">Charges</div>
                        {chargesQ.isLoading ? (
                            <Skeleton className="h-10 w-full"/>
                        ) : chargesQ.isError ? (
                            <div className="text-sm text-destructive">
                                {chargesQ.error?.response?.data?.detail || chargesQ.error?.message || "Failed to load charges"}
                            </div>
                        ) : charges.length ? (
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-right">Amount</th>
                                        <th className="px-3 py-2 text-center">Collected</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {charges.map((c) => (
                                        <tr key={c.charge_id} className="border-t">
                                            <td className="px-3 py-2">{c.charge_type}</td>
                                            <td className="px-3 py-2 text-right">{money(c.amount)}</td>
                                            <td className="px-3 py-2 text-center">{c.is_collected ? "Yes" : "No"}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No charges.</div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>

                    <Button
                        onClick={async () => {
                            try {
                                if (!loanId) return;
                                await onSave?.(loanId, payload);
                            } catch (e) {
                                toast({
                                    title: "Update failed",
                                    description: e?.response?.data?.detail || e?.message,
                                    variant: "destructive",
                                });
                            }
                        }}
                        disabled={disableSave}
                    >
                        {isSaving ? "Saving..." : "Save Principal"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MiniK({title, value}) {
    return (
        <div className="rounded-lg border p-2">
            <div className="text-[11px] text-muted-foreground">{title}</div>
            <div className="text-sm font-semibold">{value}</div>
        </div>
    );
}
