// src/pages/LoanViewPage.jsx
import React, {useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

import {useLoanSummary, useLoanSchedule, useLoanStatement, useLoanMaster} from "@/hooks/useLoans.js";
import {useLoanOfficerById} from "@/hooks/useLoanOfficers.js";

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
    try {
        return new Date(v).toLocaleString();
    } catch {
        return String(v);
    }
}

function isNumericId(v) {
    return /^\d+$/.test(String(v || "").trim());
}

function readLoanAccountSuggestions() {
    try {
        const raw = localStorage.getItem("mf.loanAccountNos.v1");
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export default function LoanViewPage() {
    // Route param still :loan_id, but can be "123" or "LN-0001"
    const {loan_id: loanRef} = useParams();
    const navigate = useNavigate();

    const suggestions = useMemo(() => readLoanAccountSuggestions(), []);
    const [searchRef, setSearchRef] = useState(loanRef || "");

    // ---- Step 1: if param is numeric => use directly, else resolve loan_id via /loans/master ----
    const cleanedRef = useMemo(() => String(loanRef || "").trim(), [loanRef]);
    const isId = useMemo(() => isNumericId(cleanedRef), [cleanedRef]);

    const masterFilters = useMemo(() => {
        if (!cleanedRef || isId) return null;
        return {
            search: cleanedRef,
            limit: 50,
            offset: 0,
        };
    }, [cleanedRef, isId]);

    const {
        data: masterData,
        isLoading: masterLoading,
        isError: masterError,
    } = useLoanMaster(masterFilters || {limit: 0, offset: 0, search: ""});

    const resolvedLoanId = useMemo(() => {
        if (isId) return Number(cleanedRef);
        if (!cleanedRef) return null;

        const rows = Array.isArray(masterData)
            ? masterData
            : (masterData?.rows ?? masterData?.items ?? []);

        const hit = rows.find(
            (x) =>
                String(x?.loan_account_no || "")
                    .trim()
                    .toLowerCase() === cleanedRef.toLowerCase()
        );

        return hit?.loan_id ?? null;
    }, [masterData, cleanedRef, isId]);

    // ✅ FINAL identifier: always loan_id only
    const identifier = useMemo(() => {
        if (!resolvedLoanId) return null;
        return {loan_id: Number(resolvedLoanId)};
    }, [resolvedLoanId]);

    // ---- Step 2: use resolved loan_id for all backend calls ----
    const {data: summary, isLoading: summaryLoading, isError: summaryError} = useLoanSummary(identifier);
    const {data: schedule, isLoading: scheduleLoading, isError: scheduleError} = useLoanSchedule(identifier);
    const {data: statement, isLoading: statementLoading, isError: statementError} = useLoanStatement(identifier);

    const paymentTxns = useMemo(() => {
        const list = statement || [];
        return list.filter((x) => x.txn_type === "PAYMENT");
    }, [statement]);

    const headerRefLabel = useMemo(() => {
        if (!cleanedRef) return "-";
        if (isId) return `Loan ID: ${cleanedRef}`;
        if (resolvedLoanId) return `Loan ID: ${resolvedLoanId} (from Loan A/C: ${cleanedRef})`;
        return `Loan A/C: ${cleanedRef}`;
    }, [cleanedRef, isId, resolvedLoanId]);

    function goToLoan(ref) {
        const clean = String(ref || "").trim();
        if (!clean) return;
        navigate(`/dashboard/loans/view/${encodeURIComponent(clean)}`);
    }

    const resolvingFromAccountNo = !!cleanedRef && !isId && !resolvedLoanId;

    // ✅ Loan Officer Name lookup using your new hook
    const loId = summary?.lo_id ?? null;
    const {
        data: loanOfficer,
        isLoading: loLoading,
        isError: loError,
    } = useLoanOfficerById(loId, {enabled: !!loId});

    const loanOfficerName = useMemo(() => {
        if (!loId) return "-";
        return (
            loanOfficer?.employee?.full_name ||
            loanOfficer?.employee?.user?.username ||
            `LO-${loId}`
        );
    }, [loanOfficer, loId]);

    return (
        <div className="space-y-4">
            {/* ✅ HEADER */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <CardTitle className="text-xl">Loan View</CardTitle>

                            <div className="text-sm text-muted-foreground">
                                <span className="font-medium">{headerRefLabel}</span>
                            </div>

                            {/* ✅ Search with Suggestions */}
                            <div className="flex items-center gap-2">
                                <div className="w-[320px]">
                                    <Input
                                        value={searchRef}
                                        onChange={(e) => setSearchRef(e.target.value)}
                                        placeholder="Enter Loan ID (123) or Loan Account No (LN-0001)"
                                        list="loanAccountSuggestions"
                                    />
                                    <datalist id="loanAccountSuggestions">
                                        {suggestions.map((x) => (
                                            <option key={x} value={x}/>
                                        ))}
                                    </datalist>
                                </div>

                                <Button onClick={() => goToLoan(searchRef)}>Open</Button>
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

            {/* ✅ Resolve status when user opened using Loan Account No */}
            {resolvingFromAccountNo ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Resolving Loan Account No…</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {masterLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-1/3"/>
                                <Skeleton className="h-10 w-full"/>
                            </div>
                        ) : masterError ? (
                            <p className="text-sm text-destructive">Failed to resolve Loan Account No.</p>
                        ) : (
                            <p className="text-sm text-destructive">
                                Loan not found for account no:{" "}
                                <span className="font-medium">{cleanedRef}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
            ) : null}

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
                            {/* ✅ all cells centered */}
                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Loan Account No</div>
                                <div className="font-medium">{summary.loan_account_no || "-"}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Member Name</div>
                                <div className="font-medium">{summary.member_name || "-"}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Group Name</div>
                                <div className="font-medium">{summary.group_name || "-"}</div>
                            </div>

                            {/* ✅ Loan Officer shows Name + LO ID small */}
                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Loan Officer Name</div>

                                {loLoading ? (
                                    <Skeleton className="h-5 w-28"/>
                                ) : loError ? (
                                    <div className="font-medium">{loId != null ? `LO-${loId}` : "-"}</div>
                                ) : (
                                    <div className="font-medium">{loanOfficerName}</div>
                                )}
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Principal Amount</div>
                                <div className="font-medium">₹ {money(summary.principal_amount)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Total Interest Amount</div>
                                <div className="font-medium">₹ {money(summary.interest_amount_total)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Total Amount Disbursed</div>
                                <div className="font-medium">₹ {money(summary.total_disbursed_amount)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Total Amount Paid</div>
                                <div className="font-medium">₹ {money(summary.total_paid)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Outstanding Balance</div>
                                <div className="font-medium">₹ {money(summary.outstanding)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center">
                                <div className="text-m text-muted-foreground mb-2">Advance Balance</div>
                                <div className="font-medium">₹ {money(summary.advance_balance)}</div>
                            </div>

                            <div className="rounded-md border p-3 text-center flex flex-col items-center md:col-span-2">
                                <div className="text-m text-muted-foreground mb-2">Next Due Date & Amount</div>
                                <div className="font-medium">
                                    {fmtDate(summary.next_due_date)}{" "}
                                    {summary.next_due_amount != null
                                        ? `(₹ ${money(summary.next_due_amount)})`
                                        : ""}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ✅ TABS */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Loan Details</CardTitle>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="schedule" className="w-full">
                        <TabsList>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            <TabsTrigger value="statement">Statement</TabsTrigger>
                            <TabsTrigger value="payments">Paid Installments</TabsTrigger>
                        </TabsList>

                        {/* Schedule */}
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

                        {/* Statement */}
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

                        {/* Payments */}
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
