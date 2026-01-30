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
import CommonTable from "@/Utils/CommonTable.jsx";

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

    // ---- CommonTable mappings ----
    const scheduleColumns = useMemo(
        () => ["Inst", "Due Date", "Principal Due", "Interest Due", "Total Due", "Total Paid", "Status", "Paid Date"],
        []
    );

    const scheduleRows = useMemo(() => {
        const list = schedule || [];
        return list.map((r) => ({
            key: String(r.installment_id),
            cells: [
                <div className="text-center">{r.installment_no}</div>,
                <div className="text-center">{fmtDate(r.due_date)}</div>,
                <div className="text-right">{money(r.principal_due)}</div>,
                <div className="text-right">{money(r.interest_due)}</div>,
                <div className="text-right">{money(r.total_due)}</div>,
                <div className="text-right">{money(r.total_paid)}</div>,
                <div className="text-center">
                    <Badge variant="secondary">{r.status}</Badge>
                </div>,
                <div className="text-center">{fmtDate(r.paid_date)}</div>,
            ],
        }));
    }, [schedule]);

    const statementColumns = useMemo(
        () => ["Ledger ID", "Date & Time", "Type", "Debit", "Credit", "Outstanding", "Narration"],
        []
    );

    const statementRows = useMemo(() => {
        const list = statement || [];
        return list.map((x) => ({
            key: String(x.ledger_id),
            cells: [
                <div className="text-center">{x.ledger_id}</div>,
                <div>{fmtDateTime(x.txn_date)}</div>,
                <div>
                    <Badge variant="secondary">{x.txn_type}</Badge>
                </div>,
                <div className="text-right">{money(x.debit)}</div>,
                <div className="text-right">{money(x.credit)}</div>,
                <div className="text-right">{money(x.balance_outstanding)}</div>,
                <div className="whitespace-pre-wrap">{x.narration || "-"}</div>,
            ],
        }));
    }, [statement]);

    const paymentsColumns = useMemo(
        () => ["Date & Time", "Paid", "Outstanding After", "Narration"],
        []
    );

    const paymentsRows = useMemo(() => {
        return (paymentTxns || []).map((x) => ({
            key: String(x.ledger_id),
            cells: [
                <div>{fmtDateTime(x.txn_date)}</div>,
                <div className="text-right">{money(x.credit)}</div>,
                <div className="text-right">{money(x.balance_outstanding)}</div>,
                <div className="whitespace-pre-wrap">{x.narration || "-"}</div>,
            ],
        }));
    }, [paymentTxns]);

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
                            <CommonTable
                                columns={scheduleColumns}
                                rows={scheduleRows}
                                isLoading={scheduleLoading}
                                isError={scheduleError}
                                error={scheduleErrObj}
                                emptyTitle="No schedule rows found."
                                emptyDesc="No installments exist for this loan."
                            />
                        </TabsContent>

                        <TabsContent value="statement" className="mt-4">
                            <CommonTable
                                columns={statementColumns}
                                rows={statementRows}
                                isLoading={statementLoading}
                                isError={statementError}
                                error={statementErrObj}
                                emptyTitle="No statement rows found."
                                emptyDesc="No ledger entries exist for this loan."
                            />
                        </TabsContent>

                        <TabsContent value="payments" className="mt-4">
                            <CommonTable
                                columns={paymentsColumns}
                                rows={paymentsRows}
                                isLoading={statementLoading}
                                isError={statementError}
                                error={statementErrObj}
                                emptyTitle="No payments found."
                                emptyDesc="There are no PAYMENT transactions yet."
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
