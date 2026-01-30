// src/pages/LoanViewPage.jsx
import React, {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

import {
    useLoanSummary,
    useLoanSchedule,
    useLoanStatement,
} from "@/hooks/useLoans.js";
import {useLoanOfficerById} from "@/hooks/useLoanOfficers.js";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

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
    const {loan_id: loanRef} = useParams();
    const navigate = useNavigate();

    const suggestions = useMemo(() => readLoanAccountSuggestions(), []);
    const cleanedRef = useMemo(() => String(loanRef || "").trim(), [loanRef]);
    const isId = useMemo(() => isNumericId(cleanedRef), [cleanedRef]);

    // 🔹 Input state (we will auto-switch it to loan_account_no after summary loads)
    const [searchRef, setSearchRef] = useState(cleanedRef || "");

    // ✅ Use whatever user provided in URL/input:
// - numeric => loan_id endpoints
// - non-numeric => loan_account_no endpoints
    const [activeLoanRef, setActiveLoanRef] = useState(cleanedRef || "");

// keep in sync when route param changes
    useEffect(() => {
        setActiveLoanRef(cleanedRef || "");
    }, [cleanedRef]);

// ---- Load data using loan_id ----
    const {
        data: summary,
        isLoading: summaryLoading,
        isError: summaryError,
        error: summaryErrObj,
    } = useLoanSummary(activeLoanRef);

    const {
        data: schedule,
        isLoading: scheduleLoading,
        isError: scheduleError,
        error: scheduleErrObj,
    } = useLoanSchedule(activeLoanRef);

    const {
        data: statement,
        isLoading: statementLoading,
        isError: statementError,
        error: statementErrObj,
    } = useLoanStatement(activeLoanRef);

    // ✅ IMPORTANT: if route param was numeric, replace input value with loan_account_no
    useEffect(() => {
        const acc = summary?.loan_account_no ? String(summary.loan_account_no).trim() : "";
        if (!acc) return;

        // If the current input is a numeric loan_id (like "14"), replace it with account no
        if (isNumericId(searchRef) || searchRef.trim() === cleanedRef) {
            setSearchRef(acc);
            setActiveLoanRef(acc);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary?.loan_account_no]);

    const paymentTxns = useMemo(() => {
        const list = statement || [];
        return list.filter((x) => x.txn_type === "PAYMENT");
    }, [statement]);

    // ✅ Header label should prefer Loan Account No always
    const headerRefLabel = useMemo(() => {
        const acc = summary?.loan_account_no ? String(summary.loan_account_no).trim() : "";
        if (acc) return `Loan Account No: ${acc}`;

        // before summary loads:
        if (!cleanedRef) return "-";
        if (!isId) return `Loan Account No: ${cleanedRef}`;
        return `Loan Account No: -`; // don't show Loan ID
    }, [summary?.loan_account_no, cleanedRef, isId]);

    function goToLoan(ref) {
        const clean = String(ref || "").trim();
        if (!clean) return;

        // ✅ Always navigate using what user sees (Loan Account No),
        // but if user still typed a numeric id, it will still work.
        navigate(`/dashboard/loans/view/${encodeURIComponent(clean)}`);
    }

    // ---- Loan Officer Name lookup ----
    const loId = summary?.lo_id != null ? Number(summary.lo_id) : null;
    const {data: loanOfficer, isLoading: loLoading, isError: loError} =
        useLoanOfficerById(loId, {enabled: loId != null});

    const loanOfficerName = useMemo(() => {
        if (loId == null) return "-";
        return (
            loanOfficer?.employee?.full_name ||
            loanOfficer?.employee?.user?.username ||
            `LO-${loId}`
        );
    }, [loanOfficer, loId]);

    // ---- AdvancedTable data ----
    const scheduleData = useMemo(() => (Array.isArray(schedule) ? schedule : []), [schedule]);
    const statementData = useMemo(() => (Array.isArray(statement) ? statement : []), [statement]);
    const paymentsData = useMemo(() => (Array.isArray(paymentTxns) ? paymentTxns : []), [paymentTxns]);

    const scheduleTableColumns = useMemo(
        () => [
            {
                key: "installment_no",
                header: "Installment No",
                sortValue: (r) => Number(r.installment_no || 0),
                cell: (r) => <div className="text-center font-medium">{r.installment_no ?? "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "due_date",
                header: "Due Date",
                sortValue: (r) => (r?.due_date ? new Date(r.due_date).getTime() : 0),
                cell: (r) => <div className="text-center">{fmtDate(r.due_date)}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "principal_due",
                header: "Principal Due",
                sortValue: (r) => Number(r.principal_due || 0),
                cell: (r) => <div className="text-right">₹ {money(r.principal_due)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "interest_due",
                header: "Interest Due",
                sortValue: (r) => Number(r.interest_due || 0),
                cell: (r) => <div className="text-right">₹ {money(r.interest_due)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "total_due",
                header: "Total Due",
                sortValue: (r) => Number(r.total_due || 0),
                cell: (r) => <div className="text-right font-semibold">₹ {money(r.total_due)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "total_paid",
                header: "Total Paid",
                sortValue: (r) => Number(r.total_paid || 0),
                cell: (r) => <div className="text-right">₹ {money(r.total_paid)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "status",
                header: "Status",
                sortValue: (r) => r.status,
                cell: (r) => (
                    <div className="text-center">
                        <Badge variant="secondary">{r.status || "-"}</Badge>
                    </div>
                ),
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "paid_date",
                header: "Paid Date",
                sortValue: (r) => (r?.paid_date ? new Date(r.paid_date).getTime() : 0),
                cell: (r) => <div className="text-center">{fmtDate(r.paid_date)}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
        ],
        []
    );

    const statementTableColumns = useMemo(
        () => [
            {
                key: "ledger_id",
                header: "Ledger ID",
                sortValue: (r) => Number(r.ledger_id || 0),
                cell: (r) => <div className="text-center">{r.ledger_id ?? "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "txn_date",
                header: "Date & Time",
                sortValue: (r) => (r?.txn_date ? new Date(r.txn_date).getTime() : 0),
                cell: (r) => <div className="whitespace-nowrap">{fmtDateTime(r.txn_date)}</div>,
            },
            {
                key: "txn_type",
                header: "Type",
                sortValue: (r) => r.txn_type,
                cell: (r) => (
                    <div className="text-center">
                        <Badge variant="secondary">{r.txn_type || "-"}</Badge>
                    </div>
                ),
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "debit",
                header: "Debit",
                sortValue: (r) => Number(r.debit || 0),
                cell: (r) => <div className="text-right">₹ {money(r.debit)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "credit",
                header: "Credit",
                sortValue: (r) => Number(r.credit || 0),
                cell: (r) => <div className="text-right">₹ {money(r.credit)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "balance_outstanding",
                header: "Outstanding",
                sortValue: (r) => Number(r.balance_outstanding || 0),
                cell: (r) => <div className="text-right font-medium">₹ {money(r.balance_outstanding)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "narration",
                header: "Narration",
                hideable: true,
                sortValue: (r) => r.narration,
                cell: (r) => <div className="whitespace-normal">{r.narration || "-"}</div>,
            },
        ],
        []
    );

    const paymentsTableColumns = useMemo(
        () => [
            {
                key: "txn_date",
                header: "Date & Time",
                sortValue: (r) => (r?.txn_date ? new Date(r.txn_date).getTime() : 0),
                cell: (r) => <div className="whitespace-nowrap">{fmtDateTime(r.txn_date)}</div>,
            },
            {
                key: "credit",
                header: "Paid",
                sortValue: (r) => Number(r.credit || 0),
                cell: (r) => <div className="text-right font-semibold">₹ {money(r.credit)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "balance_outstanding",
                header: "Outstanding After",
                sortValue: (r) => Number(r.balance_outstanding || 0),
                cell: (r) => <div className="text-right">₹ {money(r.balance_outstanding)}</div>,
                tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
            },
            {
                key: "narration",
                header: "Narration",
                hideable: true,
                sortValue: (r) => r.narration,
                cell: (r) => <div className="whitespace-normal">{r.narration || "-"}</div>,
            },
        ],
        []
    );

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

                            <div className="flex items-center gap-2">
                                <div className="w-[320px]">
                                    <Input
                                        value={searchRef}
                                        onChange={(e) => setSearchRef(e.target.value)}
                                        placeholder="Enter Loan Account No (e.g., LN-JABA-01)"
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

            {/* ✅ Resolve status when opened using Loan Account No */}
            {/* ✅ When opened using Loan Account No, show a small loader while summary is fetching */}
            {!isId && summaryLoading ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Loading Loan…</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-1/3"/>
                            <Skeleton className="h-10 w-full"/>
                        </div>
                    </CardContent>
                </Card>
            ) : !isId && summaryError ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Loan Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-destructive">
                            Please check the Loan Account No and try again.
                        </p>
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
                                    {summary.next_due_amount != null ? `(₹ ${money(summary.next_due_amount)})` : ""}
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

                        <TabsContent value="schedule" className="mt-4">
                            <AdvancedTable
                                title="Loan Schedule"
                                description={summary?.loan_account_no ? `Loan A/C: ${summary.loan_account_no}` : ""}
                                data={scheduleData}
                                columns={scheduleTableColumns}
                                isLoading={scheduleLoading}
                                errorText={scheduleError ? "Failed to load schedule." : ""}
                                emptyText="No installments exist for this loan."
                                enableSearch
                                enablePagination
                                initialPageSize={10}
                                enableExport
                                exportFileName={`schedule_${summary?.loan_account_no || activeLoanRef || "loan"}.xlsx`}
                                rowKey={(r, idx) => r.installment_id ?? `${activeLoanRef}-sch-${idx}`}
                            />
                        </TabsContent>

                        <TabsContent value="statement" className="mt-4">
                            <AdvancedTable
                                title="Loan Statement"
                                data={statementData}
                                columns={statementTableColumns}
                                isLoading={statementLoading}
                                errorText={statementError ? "Failed to load statement." : ""}
                                emptyText="No ledger entries exist for this loan."
                                enableSearch
                                enablePagination
                                initialPageSize={10}
                                enableExport
                                exportFileName={`statement_${summary?.loan_account_no || activeLoanRef || "loan"}.xlsx`}
                                rowKey={(r, idx) => r.ledger_id ?? `${activeLoanRef}-st-${idx}`}
                            />
                        </TabsContent>

                        <TabsContent value="payments" className="mt-4">
                            <AdvancedTable
                                title="Paid Installments"
                                description="PAYMENT transactions"
                                data={paymentsData}
                                columns={paymentsTableColumns}
                                isLoading={statementLoading}
                                errorText={statementError ? "Failed to load payments." : ""}
                                emptyText="There are no PAYMENT transactions yet."
                                enableSearch
                                enablePagination
                                initialPageSize={10}
                                enableExport
                                exportFileName={`payments_${summary?.loan_account_no || activeLoanRef || "loan"}.xlsx`}
                                rowKey={(r, idx) => r.ledger_id ?? `${activeLoanRef}-pay-${idx}`}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
