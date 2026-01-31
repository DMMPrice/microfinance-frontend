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

import {getUserCtx} from "@/lib/http.js";

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
    const userCtx = typeof getUserCtx === "function" ? getUserCtx() : {};
    const role = String(userCtx?.role || "").toLowerCase();
    const isLoanOfficer =
        role === "loan_officer" || role === "loan officer" || role === "loan-officer";

    const {data, isLoading, isError, error} = useLoanSummary(loanId);
    const chargesQ = useLoanCharges(loanId);

    const pauseMut = usePauseLoan();
    const resumeMut = useResumeLoan();
    const collectMut = useCollectLoanCharge();

    const [collectOpenId, setCollectOpenId] = useState(null);

    const charges = useMemo(
        () => (Array.isArray(chargesQ.data) ? chargesQ.data : []),
        [chargesQ.data]
    );

    const pendingCharges = useMemo(() => {
        return charges.filter((c) => !c.is_collected && !c.is_waived && Number(c.amount || 0) > 0);
    }, [charges]);

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
                                    <div className="text-xs text-muted-foreground">
                                        Account: {data.loan_account_no || "-"}
                                    </div>
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
                        ) : (
                            <div className="text-xs text-muted-foreground">
                                Pause/Resume is not available for Loan Officer role.
                            </div>
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
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Loan Charges</div>
                                {chargesQ.isLoading ? (
                                    <Skeleton className="h-5 w-20"/>
                                ) : (
                                    <Badge variant="secondary">
                                        Pending: {pendingCharges.length}
                                    </Badge>
                                )}
                            </div>

                            {chargesQ.isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-9 w-full"/>
                                    <Skeleton className="h-9 w-full"/>
                                </div>
                            ) : chargesQ.isError ? (
                                <div className="text-sm text-destructive">
                                    {chargesQ.error?.response?.data?.detail ||
                                        chargesQ.error?.message ||
                                        "Failed to load charges"}
                                </div>
                            ) : charges.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No charges</div>
                            ) : (
                                <div className="space-y-2">
                                    {charges.map((c) => {
                                        const isPending = !c.is_collected && !c.is_waived && Number(c.amount || 0) > 0;
                                        return (
                                            <div key={c.charge_id} className="rounded-lg border p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm">
                                                        <div className="font-medium">
                                                            {c.charge_name || c.charge_type || `Charge #${c.charge_id}`}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Amount: ₹{money(c.amount)}
                                                        </div>
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
                                                                disabled={collectMut.isPending}
                                                                onClick={() => setCollectOpenId(c.charge_id)}
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
                                                            defaultValue={toISODateTimeLocal()}
                                                            onChange={(e) => {
                                                                c._pay_dt = e.target.value;
                                                            }}
                                                        />

                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={async () => {
                                                                    try {
                                                                        await collectMut.mutateAsync({
                                                                            loan_id: data.loan_id,
                                                                            payload: {
                                                                                charge_id: c.charge_id,
                                                                                payment_date: c._pay_dt || toISODateTimeLocal(),
                                                                            },
                                                                        });
                                                                        toast({title: "Charge collected ✅"});
                                                                        setCollectOpenId(null);
                                                                        chargesQ.refetch?.();
                                                                    } catch (e) {
                                                                        toast({
                                                                            title: "Collect failed",
                                                                            description: e?.response?.data?.detail || e?.message,
                                                                            variant: "destructive",
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={collectMut.isPending}
                                                            >
                                                                {collectMut.isPending ? "Collecting..." : "Confirm"}
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setCollectOpenId(null)}
                                                            >
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
