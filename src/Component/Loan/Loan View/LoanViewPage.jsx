// src/pages/LoanViewPage.jsx
import React, {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

import {useLoanSummary, useLoanSchedule, useLoanStatement} from "@/hooks/useLoans.js";
import {useLoanOfficerById} from "@/hooks/useLoanOfficers.js";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

import EditCollectionModal from "@/Component/Loan/EditCollectionModal.jsx";
import LoanSummaryKpis from "@/Component/Loan/LoanSummaryKpis.jsx";

import {toISTNaiveISO} from "@/Helpers/dateTimeIST";

function money(v) {
    const n = Number(v || 0);
    return n.toFixed(2);
}

// ✅ Date in IST (YYYY-MM-DD)
function fmtDateIST(v) {
    if (!v) return "-";
    const s = toISTNaiveISO(v, false); // YYYY-MM-DDTHH:mm
    return s ? s.slice(0, 10) : "-";
}

// ✅ DateTime in IST (YYYY-MM-DD HH:mm)
function fmtDateTimeIST(v) {
    if (!v) return "-";
    const s = toISTNaiveISO(v, false); // YYYY-MM-DDTHH:mm
    return s ? s.replace("T", " ") : "-";
}

// ✅ Stable IST sort epoch
function toISTEpochMs(v) {
    if (!v) return 0;
    const s = toISTNaiveISO(v, true); // YYYY-MM-DDTHH:mm:ss in IST
    if (!s) return 0;
    const t = Date.parse(s); // parse naive
    return Number.isFinite(t) ? t : 0;
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

    const [searchRef, setSearchRef] = useState(cleanedRef || "");
    const [activeLoanRef, setActiveLoanRef] = useState(cleanedRef || "");

    // ✅ Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);

    const openEdit = (row) => {
        setEditRow(row);
        setEditOpen(true);
    };

    useEffect(() => {
        setActiveLoanRef(cleanedRef || "");
    }, [cleanedRef]);

    // ---- Load data ----
    const {data: summary, isLoading: summaryLoading, isError: summaryError} =
        useLoanSummary(activeLoanRef);

    const {data: schedule, isLoading: scheduleLoading, isError: scheduleError} =
        useLoanSchedule(activeLoanRef);

    const {data: statement, isLoading: statementLoading, isError: statementError} =
        useLoanStatement(activeLoanRef);

    // ✅ If opened using numeric loan_id, auto-switch to loan_account_no after summary loads
    useEffect(() => {
        const acc = summary?.loan_account_no ? String(summary.loan_account_no).trim() : "";
        if (!acc) return;

        if (isNumericId(searchRef) || searchRef.trim() === cleanedRef) {
            setSearchRef(acc);
            setActiveLoanRef(acc);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary?.loan_account_no]);

    // ✅ Header label prefer Loan Account No always
    const headerRefLabel = useMemo(() => {
        const acc = summary?.loan_account_no ? String(summary.loan_account_no).trim() : "";
        if (acc) return `Loan Account No: ${acc}`;

        if (!cleanedRef) return "-";
        if (!isId) return `Loan Account No: ${cleanedRef}`;
        return `Loan Account No: -`;
    }, [summary?.loan_account_no, cleanedRef, isId]);

    function goToLoan(ref) {
        const clean = String(ref || "").trim();
        if (!clean) return;
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
                header: "Due Date (IST)",
                sortValue: (r) => toISTEpochMs(r?.due_date),
                cell: (r) => <div className="text-center">{fmtDateIST(r.due_date)}</div>,
                exportValue: (r) => fmtDateIST(r.due_date),
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
                header: "Paid Date (IST)",
                sortValue: (r) => toISTEpochMs(r?.paid_date),
                cell: (r) => <div className="text-center">{fmtDateIST(r.paid_date)}</div>,
                exportValue: (r) => fmtDateIST(r.paid_date),
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
                header: "Date (IST)",
                sortValue: (r) => toISTEpochMs(r?.txn_date),
                cell: (r) => <div className="whitespace-nowrap">{fmtDateTimeIST(r.txn_date)}</div>,
                exportValue: (r) => fmtDateTimeIST(r.txn_date),
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
            {
                key: "__actions",
                header: "Actions",
                cell: (r) => {
                    const t = String(r?.txn_type || "").toUpperCase();
                    const canEdit = t === "PAYMENT" || t === "ADVANCE_ADD";
                    return (
                        <div className="flex justify-center">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!canEdit}
                                onClick={() => openEdit(r)}
                            >
                                Edit
                            </Button>
                        </div>
                    );
                },
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
        ],
        []
    );

    return (
        <div className="space-y-4">
            {/* HEADER */}
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

            {/* Resolve status when opened using Loan Account No */}
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

            {/* SUMMARY KPI */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Loan Summary</CardTitle>
                </CardHeader>

                <CardContent>
                    {summaryLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-1/3"/>
                            <Skeleton className="h-28 w-full"/>
                        </div>
                    ) : summaryError ? (
                        <p className="text-sm text-destructive">Failed to load summary.</p>
                    ) : !summary ? (
                        <p className="text-sm text-muted-foreground">No summary found.</p>
                    ) : (
                        <LoanSummaryKpis summary={summary}
                                         loanOfficerName={loLoading ? "-" : (loError ? `LO-${loId}` : loanOfficerName)}/>
                    )}
                </CardContent>
            </Card>

            {/* TABS */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Loan Details</CardTitle>
                </CardHeader>

                <CardContent>
                    {/* ✅ Only 2 tabs now */}
                    <Tabs defaultValue="schedule" className="w-full">
                        <TabsList>
                            <TabsTrigger value="schedule">Schedule</TabsTrigger>
                            <TabsTrigger value="statement">Statement</TabsTrigger>
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
                                initialPageSize={5}
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
                    </Tabs>
                </CardContent>
            </Card>

            {/* Mount modal once */}
            <EditCollectionModal
                open={editOpen}
                onOpenChange={setEditOpen}
                loanId={summary?.loan_id ?? activeLoanRef}
                row={editRow}
            />
        </div>
    );
}
