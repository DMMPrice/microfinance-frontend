// src/pages/LoanViewPage.jsx
import React, {useMemo} from "react";
import {useParams} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";

import {useLoanSummary, useLoanSchedule, useLoanStatement} from "@/hooks/useLoans.js";

function money(v) {
    const n = Number(v || 0);
    return n.toFixed(2);
}

function fmtDate(v) {
    if (!v) return "-";
    return String(v).slice(0, 10);
}

function fmtDateTime(v) {
    if (!v) return "-";
    // backend gives txn_date, not created_at
    try {
        return new Date(v).toLocaleString();
    } catch {
        return String(v);
    }
}

export default function LoanViewPage() {
    const {loan_id} = useParams();

    const {
        data: summary,
        isLoading: summaryLoading,
        isError: summaryError,
    } = useLoanSummary(loan_id);

    const {
        data: schedule,
        isLoading: scheduleLoading,
        isError: scheduleError,
    } = useLoanSchedule(loan_id);

    const {
        data: statement,
        isLoading: statementLoading,
        isError: statementError,
    } = useLoanStatement(loan_id);

    const paymentTxns = useMemo(() => {
        const list = statement || [];
        return list.filter((x) => x.txn_type === "PAYMENT");
    }, [statement]);

    return (
        <div className="space-y-4">
            {/* ✅ HEADER */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl">Loan View</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Loan ID: <span className="font-medium">{loan_id}</span>
                            </div>
                        </div>

                        {summary?.status ? (
                            <Badge className="text-sm">{summary.status}</Badge>
                        ) : (
                            <Badge variant="secondary" className="text-sm">
                                -
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    View Summary, Repayment Schedule and Ledger Statement.
                </CardContent>
            </Card>

            {/* ✅ SUMMARY CARD */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Loan Summary</CardTitle>
                </CardHeader>

                <CardContent>
                    {summaryLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-1/3"/>
                            <Skeleton className="h-24 w-full"/>
                        </div>
                    ) : summaryError ? (
                        <p className="text-sm text-destructive">Failed to load summary.</p>
                    ) : !summary ? (
                        <p className="text-sm text-muted-foreground">No summary found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Loan Account No</div>
                                <div className="font-medium">{summary.loan_account_no || "-"}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Member</div>
                                <div className="font-medium">{summary.member_name}</div>
                                <div className="text-xs text-muted-foreground">Member ID: {summary.member_id}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Group</div>
                                <div className="font-medium">{summary.group_name}</div>
                                <div className="text-xs text-muted-foreground">Group ID: {summary.group_id}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Loan Officer ID</div>
                                <div className="font-medium">{summary.lo_id ?? "-"}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Principal</div>
                                <div className="font-medium">₹ {money(summary.principal_amount)}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Interest (Total)</div>
                                <div className="font-medium">₹ {money(summary.interest_amount_total)}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Total Disbursed</div>
                                <div className="font-medium">₹ {money(summary.total_disbursed_amount)}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Total Paid</div>
                                <div className="font-medium">₹ {money(summary.total_paid)}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Outstanding</div>
                                <div className="font-medium">₹ {money(summary.outstanding)}</div>
                            </div>

                            <div className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">Advance Balance</div>
                                <div className="font-medium">₹ {money(summary.advance_balance)}</div>
                            </div>

                            <div className="rounded-md border p-3 md:col-span-2">
                                <div className="text-xs text-muted-foreground">Next Due</div>
                                <div className="font-medium">
                                    {fmtDate(summary.next_due_date)}{" "}
                                    {summary.next_due_amount != null ? `(₹ ${money(summary.next_due_amount)})` : ""}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ✅ TABS: Schedule + Statement */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="schedule" className="w-full">
                        <TabsList>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            <TabsTrigger value="statement">Statement</TabsTrigger>
                            <TabsTrigger value="payments">Payments Only</TabsTrigger>
                        </TabsList>

                        {/* ✅ SCHEDULE */}
                        <TabsContent value="schedule" className="mt-4">
                            {scheduleLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-24 w-full"/>
                                </div>
                            ) : scheduleError ? (
                                <p className="text-sm text-destructive">Failed to load schedule.</p>
                            ) : !schedule || schedule.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No schedule rows found.</p>
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-sm border rounded-md">
                                        <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 border">Inst</th>
                                            <th className="p-2 border">Due Date</th>
                                            <th className="p-2 border text-right">Principal Due</th>
                                            <th className="p-2 border text-right">Interest Due</th>
                                            <th className="p-2 border text-right">Total Due</th>
                                            <th className="p-2 border text-right">Total Paid</th>
                                            <th className="p-2 border">Status</th>
                                            <th className="p-2 border">Paid Date</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {schedule.map((r) => (
                                            <tr key={r.installment_id}>
                                                <td className="p-2 border text-center">{r.installment_no}</td>
                                                <td className="p-2 border text-center">{fmtDate(r.due_date)}</td>
                                                <td className="p-2 border text-right">{money(r.principal_due)}</td>
                                                <td className="p-2 border text-right">{money(r.interest_due)}</td>
                                                <td className="p-2 border text-right">{money(r.total_due)}</td>
                                                <td className="p-2 border text-right">{money(r.total_paid)}</td>
                                                <td className="p-2 border text-center">
                                                    <Badge variant="secondary">{r.status}</Badge>
                                                </td>
                                                <td className="p-2 border text-center">{fmtDate(r.paid_date)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        {/* ✅ STATEMENT */}
                        <TabsContent value="statement" className="mt-4">
                            {statementLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-24 w-full"/>
                                </div>
                            ) : statementError ? (
                                <p className="text-sm text-destructive">Failed to load statement.</p>
                            ) : !statement || statement.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No statement rows found.</p>
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-sm border rounded-md">
                                        <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 border">Ledger ID</th>
                                            <th className="p-2 border">Date & Time</th>
                                            <th className="p-2 border">Type</th>
                                            <th className="p-2 border text-right">Debit</th>
                                            <th className="p-2 border text-right">Credit</th>
                                            <th className="p-2 border text-right">Outstanding</th>
                                            <th className="p-2 border">Narration</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {statement.map((x) => (
                                            <tr key={x.ledger_id}>
                                                <td className="p-2 border text-center">{x.ledger_id}</td>
                                                <td className="p-2 border">{fmtDateTime(x.txn_date)}</td>
                                                <td className="p-2 border">
                                                    <Badge variant="secondary">{x.txn_type}</Badge>
                                                </td>
                                                <td className="p-2 border text-right">{money(x.debit)}</td>
                                                <td className="p-2 border text-right">{money(x.credit)}</td>
                                                <td className="p-2 border text-right">{money(x.balance_outstanding)}</td>
                                                <td className="p-2 border">{x.narration || "-"}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        {/* ✅ PAYMENTS ONLY */}
                        <TabsContent value="payments" className="mt-4">
                            {statementLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-24 w-full"/>
                                </div>
                            ) : paymentTxns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No payments found.</p>
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-sm border rounded-md">
                                        <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 border">Date & Time</th>
                                            <th className="p-2 border text-right">Paid</th>
                                            <th className="p-2 border text-right">Outstanding After</th>
                                            <th className="p-2 border">Narration</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {paymentTxns.map((x) => (
                                            <tr key={x.ledger_id}>
                                                <td className="p-2 border">{fmtDateTime(x.txn_date)}</td>
                                                <td className="p-2 border text-right">{money(x.credit)}</td>
                                                <td className="p-2 border text-right">{money(x.balance_outstanding)}</td>
                                                <td className="p-2 border">{x.narration || "-"}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
