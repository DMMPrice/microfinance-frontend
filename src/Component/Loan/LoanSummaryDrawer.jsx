// src/pages/Loans/LoanSummaryDrawer.jsx
import React, {useMemo, useState} from "react";
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

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function toISODateTimeLocal() {
    // for default payment_date
    return new Date().toISOString();
}

function canPause(status) {
    return ["DISBURSED", "ACTIVE"].includes(String(status || "").toUpperCase());
}

function canResume(status) {
    return ["PAUSED"].includes(String(status || "").toUpperCase());
}

export default function LoanSummaryDrawer({open, onOpenChange, loanId}) {
    const {data, isLoading, isError, error} = useLoanSummary(loanId);
    const chargesQ = useLoanCharges(loanId);

    const pauseMut = usePauseLoan();
    const resumeMut = useResumeLoan();
    const collectMut = useCollectLoanCharge();

    const [collectOpenId, setCollectOpenId] = useState(null);

    const charges = useMemo(() => (Array.isArray(chargesQ.data) ? chargesQ.data : []), [chargesQ.data]);

    const pendingCharges = useMemo(() => {
        return charges.filter((c) => !c.is_collected && !c.is_waived && Number(c.amount || 0) > 0);
    }, [charges]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Loan Summary</SheetTitle>
                </SheetHeader>

                {isLoading && (
                    <div className="space-y-3 mt-4">
                        <Skeleton className="h-6 w-2/3"/>
                        <Skeleton className="h-24 w-full"/>
                        <Skeleton className="h-24 w-full"/>
                    </div>
                )}

                {isError && (
                    <div className="mt-4 text-sm text-destructive">
                        {error?.response?.data?.detail || error?.message || "Failed to load summary"}
                    </div>
                )}

                {data && (
                    <div className="mt-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold">{data.loan_account_no}</div>
                                <div className="text-sm text-muted-foreground">
                                    {data.member_name} • {data.group_name}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{data.status}</Badge>
                            </div>
                        </div>

                        {/* Pause/Resume actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                disabled={!canPause(data.status) || pauseMut.isPending}
                                onClick={async () => {
                                    try {
                                        await pauseMut.mutateAsync({loan_id: data.loan_id, payload: {}});
                                        toast({title: "Loan paused ✅"});
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
                                        toast({title: "Loan resumed ✅"});
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

                        {/* Summary KPIs */}
                        <div className="grid grid-cols-2 gap-3">
                            <K title="Principal" value={money(data.principal_amount)}/>
                            <K title="Interest Total" value={money(data.interest_amount_total)}/>
                            <K title="Total Disbursed" value={money(data.total_disbursed_amount)}/>
                            <K title="Total Paid" value={money(data.total_paid)}/>
                            <K title="Outstanding" value={money(data.outstanding)}/>
                            <K title="Advance Balance" value={money(data.advance_balance)}/>
                        </div>

                        {/* Next installment */}
                        <div className="rounded-lg border p-3">
                            <div className="text-sm font-semibold">Next Installment</div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Due Date: <span className="text-foreground">{data.next_due_date || "-"}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Due Amount:{" "}
                                <span className="text-foreground">
                  {data.next_due_amount != null ? money(data.next_due_amount) : "-"}
                </span>
                            </div>
                        </div>

                        {/* Charges section */}
                        <div className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">Charges</div>
                                {chargesQ.isLoading ? (
                                    <span className="text-xs text-muted-foreground">Loading…</span>
                                ) : (
                                    <Badge variant="outline">
                                        Pending: {pendingCharges.length}
                                    </Badge>
                                )}
                            </div>

                            {chargesQ.isError ? (
                                <div className="text-sm text-destructive">
                                    {chargesQ.error?.response?.data?.detail || chargesQ.error?.message || "Failed to load charges"}
                                </div>
                            ) : null}

                            {charges.length === 0 && !chargesQ.isLoading ? (
                                <div className="text-sm text-muted-foreground">No charges found.</div>
                            ) : null}

                            {/* Simple charges table */}
                            {charges.length > 0 ? (
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Type</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-center">Status</th>
                                            <th className="px-3 py-2 text-right">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {charges.map((c) => {
                                            const collected = !!c.is_collected;
                                            const waived = !!c.is_waived;
                                            const disabled = collected || waived;

                                            return (
                                                <tr key={c.charge_id} className="border-t">
                                                    <td className="px-3 py-2">{c.charge_type}</td>
                                                    <td className="px-3 py-2 text-right">{money(c.amount)}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {collected ? (
                                                            <Badge variant="secondary">COLLECTED</Badge>
                                                        ) : waived ? (
                                                            <Badge variant="outline">WAIVED</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">PENDING</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={disabled}
                                                            onClick={() => setCollectOpenId(c.charge_id)}
                                                        >
                                                            Collect
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}

                            {/* Inline collect form (minimal) */}
                            {collectOpenId ? (
                                <CollectChargeInline
                                    charge={charges.find((x) => x.charge_id === collectOpenId)}
                                    loading={collectMut.isPending}
                                    onClose={() => setCollectOpenId(null)}
                                    onSubmit={async (payload) => {
                                        try {
                                            await collectMut.mutateAsync({
                                                loan_id: data.loan_id,
                                                charge_id: collectOpenId,
                                                payload,
                                            });
                                            toast({title: "Charge collected ✅"});
                                            setCollectOpenId(null);
                                        } catch (e) {
                                            toast({
                                                title: "Collect failed",
                                                description: e?.response?.data?.detail || e?.message,
                                                variant: "destructive",
                                            });
                                        }
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function K({title, value}) {
    return (
        <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="text-base font-semibold">{value}</div>
        </div>
    );
}

function CollectChargeInline({charge, loading, onClose, onSubmit}) {
    const [mode, setMode] = useState("CASH");
    const [receipt, setReceipt] = useState("");
    const [remarks, setRemarks] = useState("");
    const [amount, setAmount] = useState(() => String(charge?.amount ?? ""));

    if (!charge) return null;

    return (
        <div className="rounded-md border bg-muted/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">
                    Collect: {charge.charge_type} (₹{Number(charge.amount || 0)})
                </div>
                <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Amount Received</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)}/>
                </div>

                <div className="space-y-1">
                    <Label>Payment Mode</Label>
                    <Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="CASH / UPI / BANK"/>
                </div>

                <div className="space-y-1">
                    <Label>Receipt No</Label>
                    <Input value={receipt} onChange={(e) => setReceipt(e.target.value)}/>
                </div>

                <div className="space-y-1">
                    <Label>Remarks</Label>
                    <Input value={remarks} onChange={(e) => setRemarks(e.target.value)}/>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                    disabled={loading}
                    onClick={() =>
                        onSubmit({
                            charge_type: charge.charge_type,
                            payment_date: toISODateTimeLocal(),
                            amount_received: Number(amount || 0),
                            payment_mode: mode,
                            receipt_no: receipt || null,
                            remarks: remarks || null,
                        })
                    }
                >
                    {loading ? "Collecting..." : "Collect"}
                </Button>
            </div>
        </div>
    );
}
