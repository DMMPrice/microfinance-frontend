// src/pages/Loans/LoanSummaryDrawer.jsx
import React, {useMemo, useState, useEffect} from "react";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "@/components/ui/use-toast";

import {
    useLoanSummary,
    useLoanCharges,
    usePauseLoan,
    useResumeLoan,
    useCollectLoanCharge,
} from "@/hooks/useLoans";

import {getUserCtx} from "@/lib/http.js";

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// datetime-local expects "YYYY-MM-DDTHH:mm"
function toDateTimeLocalValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// ✅ convert "YYYY-MM-DDTHH:mm" => "YYYY-MM-DDTHH:mm:00"
// (FastAPI/Pydantic can parse it as datetime)
function toBackendISO(dtLocal) {
    if (!dtLocal) return null;
    const s = String(dtLocal).trim();
    if (!s) return null;
    // If user already typed seconds, keep it
    if (s.length === 16) return `${s}:00`; // add seconds
    return s;
}

function canPause(status) {
    return ["DISBURSED", "ACTIVE"].includes(String(status || "").toUpperCase());
}

function canResume(status) {
    return ["PAUSED"].includes(String(status || "").toUpperCase());
}

// compute pending payable amount for a charge row
function getChargePendingAmount(c) {
    const amount = Number(c?.amount || 0);
    const waived = Number(c?.waived_amount || 0);
    const collected = Number(c?.collected_amount || 0);
    const payable = amount - waived;
    const pending = payable - collected;
    return pending > 0 ? pending : 0;
}

export default function LoanSummaryDrawer({open, onOpenChange, loanId}) {
    const userCtx = typeof getUserCtx === "function" ? getUserCtx() : {};
    const role = String(userCtx?.role || "").toLowerCase();
    const isLoanOfficer = role === "loan_officer" || role === "loan officer" || role === "loan-officer";

    const {data, isLoading, isError, error} = useLoanSummary(loanId);
    const chargesQ = useLoanCharges(loanId);

    const pauseMut = usePauseLoan();
    const resumeMut = useResumeLoan();
    const collectMut = useCollectLoanCharge();

    const [collectOpenId, setCollectOpenId] = useState(null);

    // ✅ per-charge payment date state (avoid mutating API objects)
    const [payDtByChargeId, setPayDtByChargeId] = useState({});

    // ✅ collect-all common payment date
    const [collectAllDt, setCollectAllDt] = useState(() => toDateTimeLocalValue());

    // optional: default modes for now
    const [collectAllMode, setCollectAllMode] = useState("CASH");
    const [collectAllReceipt, setCollectAllReceipt] = useState("");
    const [collectAllRemarks, setCollectAllRemarks] = useState("Charge collected");

    // reset per-charge dt when drawer opens/closes
    useEffect(() => {
        if (!open) {
            setCollectOpenId(null);
            setPayDtByChargeId({});
        }
    }, [open]);

    const charges = useMemo(() => (Array.isArray(chargesQ.data) ? chargesQ.data : []), [chargesQ.data]);

    const pendingCharges = useMemo(() => {
        return charges.filter((c) => !c.is_collected && !c.is_waived && getChargePendingAmount(c) > 0);
    }, [charges]);

    async function handleCollectSingle(c) {
        try {
            if (!data?.loan_id) return;

            const pendingAmt = getChargePendingAmount(c);
            if (pendingAmt <= 0) {
                toast({title: "Nothing pending for this charge"});
                return;
            }

            const dtLocal = payDtByChargeId[c.charge_id] ?? toDateTimeLocalValue();
            const payment_date = toBackendISO(dtLocal);

            await collectMut.mutateAsync({
                loan_id: data.loan_id,
                charge_id: c.charge_id, // ✅ REQUIRED for URL
                payload: {
                    payment_date,
                    amount_received: pendingAmt, // ✅ REQUIRED by backend
                    payment_mode: "CASH",
                    receipt_no: "",
                    remarks: `Manual charge collection: ${c.charge_type || ""}`.trim(),
                },
            });

            toast({title: "Charge collected "});
            setCollectOpenId(null);
            await chargesQ.refetch?.();
        } catch (e) {
            toast({
                title: "Collect failed",
                description: e?.response?.data?.detail || e?.message,
                variant: "destructive",
            });
        }
    }

    async function handleCollectAll() {
        try {
            if (!data?.loan_id) return;

            const list = pendingCharges;
            if (!list.length) {
                toast({title: "No pending charges"});
                return;
            }

            const payment_date = toBackendISO(collectAllDt || toDateTimeLocalValue());

            let ok = 0;
            let fail = 0;
            const failed = [];

            // sequential to keep backend safe
            for (const c of list) {
                const pendingAmt = getChargePendingAmount(c);
                if (pendingAmt <= 0) continue;

                try {
                    await collectMut.mutateAsync({
                        loan_id: data.loan_id,
                        charge_id: c.charge_id, // ✅ REQUIRED for URL
                        payload: {
                            payment_date,
                            amount_received: pendingAmt, // ✅ REQUIRED by backend
                            payment_mode: collectAllMode || "CASH",
                            receipt_no: collectAllReceipt || "",
                            remarks: collectAllRemarks || "Charge collected",
                        },
                    });
                    ok += 1;
                } catch (e) {
                    fail += 1;
                    failed.push({
                        charge_id: c.charge_id,
                        msg: e?.response?.data?.detail || e?.message || "Failed",
                    });
                }
            }

            if (fail === 0) {
                toast({title: `Collected all charges (${ok})`});
            } else if (ok === 0) {
                toast({
                    title: "Collect all failed",
                    description: `Failed: ${fail}`,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Collect all partially done",
                    description: `Success: ${ok}, Failed: ${fail}`,
                    variant: "destructive",
                });
            }

            setCollectOpenId(null);
            await chargesQ.refetch?.();

            if (failed.length) {
                // eslint-disable-next-line no-console
                console.warn("Collect all failures:", failed);
            }
        } catch (e) {
            toast({
                title: "Collect all failed",
                description: e?.response?.data?.detail || e?.message,
                variant: "destructive",
            });
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Loan Summary</SheetTitle>
                </SheetHeader>

                {isLoading ? (
                    <div className="space-y-4 mt-4">
                        <Skeleton className="h-6 w-40"/>
                        <Skeleton className="h-20 w-full"/>
                        <Skeleton className="h-20 w-full"/>
                    </div>
                ) : isError ? (
                    <div className="mt-4 text-sm text-destructive">
                        {error?.response?.data?.detail || error?.message || "Failed to load loan summary"}
                    </div>
                ) : !data ? (
                    <div className="mt-4 text-sm text-muted-foreground">No loan data</div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {/* Header summary */}
                        <div className="rounded-xl border p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm">
                                    <div className="font-semibold">Loan #{data.loan_id}</div>
                                    <div
                                        className="text-xs text-muted-foreground">Account: {data.loan_account_no || "-"}</div>
                                </div>
                                <Badge variant="secondary">{data.status}</Badge>
                            </div>
                        </div>

                        {/* Pause/Resume actions */}
                        {!isLoanOfficer ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    disabled={!canPause(data.status) || pauseMut.isPending}
                                    onClick={async () => {
                                        try {
                                            await pauseMut.mutateAsync({loan_id: data.loan_id, payload: {}});
                                            toast({title: "Loan paused "});
                                        } catch (e) {
                                            toast({
                                                title: "Pause failed",
                                                description: e?.response?.data?.detail || e?.message,
                                                variant: "destructive",
                                            });
                                        }
                                    }}
                                >
                                    {pauseMut.isPending ? "Pausing..." : "Pause"}
                                </Button>

                                <Button
                                    variant="outline"
                                    disabled={!canResume(data.status) || resumeMut.isPending}
                                    onClick={async () => {
                                        try {
                                            await resumeMut.mutateAsync({loan_id: data.loan_id, payload: {}});
                                            toast({title: "Loan resumed "});
                                        } catch (e) {
                                            toast({
                                                title: "Resume failed",
                                                description: e?.response?.data?.detail || e?.message,
                                                variant: "destructive",
                                            });
                                        }
                                    }}
                                >
                                    {resumeMut.isPending ? "Resuming..." : "Resume"}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">Pause/Resume is not available for Loan
                                Officer role.</div>
                        )}

                        {/* Summary KPIs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border p-3">
                                <div className="text-xs text-muted-foreground">Principal</div>
                                <div className="font-semibold">{money(data.principal_amount)}</div>
                            </div>
                            <div className="rounded-xl border p-3">
                                <div className="text-xs text-muted-foreground">Outstanding</div>
                                <div className="font-semibold">{money(data.outstanding_amount)}</div>
                            </div>
                            <div className="rounded-xl border p-3">
                                <div className="text-xs text-muted-foreground">Paid</div>
                                <div className="font-semibold">{money(data.total_paid)}</div>
                            </div>
                            <div className="rounded-xl border p-3">
                                <div className="text-xs text-muted-foreground">Installment (weekly)</div>
                                <div className="font-semibold">{money(data.installment_amount)}</div>
                            </div>
                        </div>

                        {/* Charges section */}
                        <div className="rounded-xl border p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-semibold">Loan Charges</div>
                                {chargesQ.isLoading ? <Skeleton className="h-5 w-20"/> :
                                    <Badge variant="secondary">Pending: {pendingCharges.length}</Badge>}
                            </div>

                            {/* Collect All */}
                            {!chargesQ.isLoading && pendingCharges.length > 0 ? (
                                <div className="rounded-lg border p-2 space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                        Collect all pending charges with one payment date
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Payment date</Label>
                                            <Input
                                                type="datetime-local"
                                                value={collectAllDt}
                                                onChange={(e) => setCollectAllDt(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Payment mode</Label>
                                            <Input
                                                value={collectAllMode}
                                                onChange={(e) => setCollectAllMode(e.target.value)}
                                                placeholder="CASH"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Receipt no</Label>
                                            <Input
                                                value={collectAllReceipt}
                                                onChange={(e) => setCollectAllReceipt(e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Remarks</Label>
                                            <Input
                                                value={collectAllRemarks}
                                                onChange={(e) => setCollectAllRemarks(e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={handleCollectAll}
                                        disabled={isLoanOfficer || pendingCharges.length === 0 || collectMut.isPending}
                                    >
                                        {collectMut.isPending
                                            ? "Collecting..."
                                            : pendingCharges.length === 0
                                                ? "Collect All (0)"
                                                : `Collect All (${pendingCharges.length})`}
                                    </Button>

                                    {pendingCharges.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">
                                            No pending charges right now.
                                        </div>
                                    ) : null}

                                    {isLoanOfficer ? (
                                        <div className="text-xs text-muted-foreground">
                                            Collect All is not available for Loan Officer role.
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {chargesQ.isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-9 w-full"/>
                                    <Skeleton className="h-9 w-full"/>
                                </div>
                            ) : chargesQ.isError ? (
                                <div className="text-sm text-destructive">
                                    {chargesQ.error?.response?.data?.detail || chargesQ.error?.message || "Failed to load charges"}
                                </div>
                            ) : charges.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No charges</div>
                            ) : (
                                <div className="space-y-2">
                                    {charges.map((c) => {
                                        const pendingAmt = getChargePendingAmount(c);
                                        const isPending = !c.is_collected && !c.is_waived && pendingAmt > 0;

                                        return (
                                            <div key={c.charge_id} className="rounded-lg border p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm">
                                                        <div
                                                            className="font-medium">{c.charge_name || c.charge_type || `Charge #${c.charge_id}`}</div>
                                                        <div className="text-xs text-muted-foreground">Amount:
                                                            ₹{money(c.amount)}</div>
                                                        {isPending ? (
                                                            <div className="text-xs text-muted-foreground">Pending:
                                                                ₹{money(pendingAmt)}</div>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {c.is_collected ? (
                                                            <Badge variant="secondary">Collected</Badge>
                                                        ) : c.is_waived ? (
                                                            <Badge variant="secondary">Waived</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Pending</Badge>
                                                        )}

                                                        {isPending ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={collectMut.isPending || isLoanOfficer}
                                                                onClick={() => {
                                                                    setCollectOpenId(c.charge_id);
                                                                    setPayDtByChargeId((p) => ({
                                                                        ...p,
                                                                        [c.charge_id]: p[c.charge_id] ?? toDateTimeLocalValue(),
                                                                    }));
                                                                }}
                                                            >
                                                                Collect
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {collectOpenId === c.charge_id ? (
                                                    <div className="mt-3 space-y-2">
                                                        <Label className="text-xs">Payment date</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={payDtByChargeId[c.charge_id] ?? toDateTimeLocalValue()}
                                                            onChange={(e) =>
                                                                setPayDtByChargeId((p) => ({
                                                                    ...p,
                                                                    [c.charge_id]: e.target.value
                                                                }))
                                                            }
                                                        />

                                                        <div className="flex items-center gap-2">
                                                            <Button size="sm" onClick={() => handleCollectSingle(c)}
                                                                    disabled={collectMut.isPending}>
                                                                {collectMut.isPending ? "Collecting..." : "Confirm"}
                                                            </Button>

                                                            <Button size="sm" variant="outline"
                                                                    onClick={() => setCollectOpenId(null)}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
