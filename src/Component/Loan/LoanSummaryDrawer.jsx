// src/pages/Loans/LoanSummaryDrawer.jsx
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {useLoanSummary, useLoanCharges} from "@/hooks/useLoans";

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function safeText(v) {
    if (v === null || v === undefined) return "-";
    const s = String(v).trim();
    return s || "-";
}

function toYMD(v) {
    if (!v) return "-";
    const s = String(v);
    // "2026-01-21T00:00:00" -> "2026-01-21"
    if (s.includes("T")) return s.split("T")[0];
    return s.slice(0, 10);
}

export default function LoanSummaryDrawer({open, onOpenChange, loanId}) {
    // ✅ pass as object for stable key type="id"
    const {data, isLoading, isError, error} = useLoanSummary(
        loanId ? {loan_id: loanId} : null
    );

    const {
        data: charges = [],
        isLoading: cLoading,
        isError: cIsError,
        error: cError,
    } = useLoanCharges(loanId);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold">{safeText(data.loan_account_no)}</div>
                                <div className="text-sm text-muted-foreground">
                                    {safeText(data.member_name)} • {safeText(data.group_name)}
                                </div>
                            </div>
                            <Badge variant="secondary">{safeText(data.status)}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <K title="Principal" value={money(data.principal_amount)}/>
                            <K title="Interest Total" value={money(data.interest_amount_total)}/>
                            <K title="Total Disbursed" value={money(data.total_disbursed_amount)}/>
                            <K title="Total Paid" value={money(data.total_paid)}/>
                            <K title="Outstanding" value={money(data.outstanding)}/>
                            <K title="Advance Balance" value={money(data.advance_balance)}/>
                        </div>

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

                        {/* ✅ Charges Breakdown */}
                        <div className="rounded-lg border overflow-hidden">
                            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                                <div className="text-sm font-semibold">Charges Breakdown</div>
                                <div className="text-xs text-muted-foreground">
                                    Pending: <span className="text-foreground">{money(data.charges_pending)}</span>
                                </div>
                            </div>

                            {cLoading ? (
                                <div className="p-3 space-y-2">
                                    <Skeleton className="h-8 w-full"/>
                                    <Skeleton className="h-8 w-full"/>
                                    <Skeleton className="h-8 w-full"/>
                                </div>
                            ) : cIsError ? (
                                <div className="p-3 text-sm text-destructive">
                                    {cError?.response?.data?.detail || cError?.message || "Failed to load charges"}
                                </div>
                            ) : (charges?.length ? (
                                <div className="max-h-64 overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-background z-[1]">
                                        <tr className="border-b">
                                            <th className="px-3 py-2 text-left">Type</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-right">Collected</th>
                                            <th className="px-3 py-2 text-right">Waived</th>
                                            <th className="px-3 py-2 text-center">Date</th>
                                            <th className="px-3 py-2 text-center">Status</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {charges.map((c) => {
                                            const collected = Number(c?.collected_amount || 0);
                                            const waived = Number(c?.waived_amount || 0);
                                            const amt = Number(c?.amount || 0);
                                            const pending = Math.max(amt - collected - waived, 0);

                                            const status = c?.is_collected
                                                ? "COLLECTED"
                                                : (pending <= 0 ? "SETTLED" : "PENDING");

                                            return (
                                                <tr key={c.charge_id} className="border-b last:border-b-0">
                                                    <td className="px-3 py-2">{safeText(c.charge_type)}</td>
                                                    <td className="px-3 py-2 text-right">{money(amt)}</td>
                                                    <td className="px-3 py-2 text-right">{money(collected)}</td>
                                                    <td className="px-3 py-2 text-right">{money(waived)}</td>
                                                    <td className="px-3 py-2 text-center">{toYMD(c.charge_date)}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <Badge
                                                            variant={status === "COLLECTED" ? "secondary" : "outline"}>
                                                            {status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-3 text-sm text-muted-foreground">
                                    No charges found.
                                </div>
                            ))}
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
