// src/pages/Loans/LoanSummaryDrawer.jsx
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {useLoanSummary} from "@/hooks/useLoans";

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function LoanSummaryDrawer({open, onOpenChange, loanId}) {
    const {data, isLoading, isError, error} = useLoanSummary(loanId);

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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold">{data.loan_account_no}</div>
                                <div className="text-sm text-muted-foreground">
                                    {data.member_name} • {data.group_name}
                                </div>
                            </div>
                            <Badge variant="secondary">{data.status}</Badge>
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
                                Due Amount: <span
                                className="text-foreground">{data.next_due_amount != null ? money(data.next_due_amount) : "-"}</span>
                            </div>
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
