// src/Component/Reports/BranchReportsPage.jsx
import React, {useEffect, useMemo, useState} from "react";
import {useBranchCashbookPassbook, useBranchLoanLedgerLogs} from "@/hooks/useReports";
import {useBranches} from "@/hooks/useBranches";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Switch} from "@/components/ui/switch";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {getUserRole, getUserBranchId} from "@/hooks/useApi";

/* ✅ helpers */
function pad2(n) {
    return String(n).padStart(2, "0");
}

function toYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(s) {
    if (!s) return null;
    const [y, m, d] = String(s).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function addDaysYmd(ymd, days) {
    const dt = parseYmd(ymd);
    if (!dt) return "";
    dt.setDate(dt.getDate() + days);
    return toYmd(dt);
}

function diffDays(aYmd, bYmd) {
    const a = parseYmd(aYmd);
    const b = parseYmd(bYmd);
    if (!a || !b) return 0;
    return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function getMonthRange(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {from: toYmd(start), to: toYmd(end)};
}

function formatINR(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-IN", {maximumFractionDigits: 2});
}

function formatDateTimeIST(v) {
    if (!v) return "-";
    const dt = new Date(v);
    if (Number.isNaN(dt.getTime())) return String(v);
    return dt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function isPrivilegedBranchPicker(role) {
    const r = (role || "").toString().trim().toLowerCase();
    return ["super_admin", "admin", "region_manager", "regional_manager"].includes(r);
}

function Kpi({label, value, subtle}) {
    return (
        <div className="rounded-lg border bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`mt-1 text-lg font-semibold ${subtle ? "text-muted-foreground" : ""}`}>
                {value}
            </div>
        </div>
    );
}

export default function Page() {
    const {from: defaultFrom, to: defaultTo} = useMemo(() => getMonthRange(), []);
    const role = useMemo(() => getUserRole(), []);
    const myBranchId = useMemo(() => getUserBranchId(), []);

    const canPickAnyBranch = isPrivilegedBranchPicker(role);
    const isBranchManager = (role || "").toLowerCase() === "branch_manager";

    const [branchId, setBranchId] = useState(isBranchManager && myBranchId ? String(myBranchId) : "");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [load, setLoad] = useState(false);

    const [reportType, setReportType] = useState("LOAN_LEDGER"); // LOAN_LEDGER | PASSBOOK

    // Loan-ledger filters
    const [includeCharges, setIncludeCharges] = useState(true);
    const [includeOtherLogs, setIncludeOtherLogs] = useState(true);
    const [includeExpenses, setIncludeExpenses] = useState(true);
    const [includeEmptyDays, setIncludeEmptyDays] = useState(true);
    const [viewMode, setViewMode] = useState("DAILY");
    const [weekStart, setWeekStart] = useState("MON");
    const [search, setSearch] = useState("");

    const {branches, isLoading: branchesLoading} = useBranches(null);

    const branchOptions = useMemo(() => {
        const opts = (branches || []).map((b) => {
            const id = b.branch_id ?? b.id;
            const name = b.branch_name ?? b.name ?? `Branch ${id}`;
            return {id: String(id), name};
        });

        if (isBranchManager && myBranchId) return opts.filter((x) => x.id === String(myBranchId));
        if (canPickAnyBranch) return opts;
        if (myBranchId) return opts.filter((x) => x.id === String(myBranchId));
        return opts;
    }, [branches, isBranchManager, myBranchId, canPickAnyBranch]);

    useEffect(() => {
        if (isBranchManager && myBranchId) {
            setBranchId(String(myBranchId));
            return;
        }
        if (!branchId && branchOptions.length === 1) setBranchId(branchOptions[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchOptions.length, isBranchManager, myBranchId]);

    useEffect(() => {
        if (!fromDate || !toDate) return;

        if (diffDays(fromDate, toDate) < 0) {
            setToDate(fromDate);
            setLoad(false);
            return;
        }

        const days = diffDays(fromDate, toDate);
        if (days > 365) {
            setToDate(addDaysYmd(fromDate, 365));
            setLoad(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate]);

    const maxToDate = fromDate ? addDaysYmd(fromDate, 365) : "";
    const canLoad = !!branchId && !!fromDate && !!toDate;

    const passbookQ = useBranchCashbookPassbook({
        branchId,
        fromDate,
        toDate,
        enabled: load && reportType === "PASSBOOK",
    });

    const loanLedgerQ = useBranchLoanLedgerLogs({
        branchId,
        fromDate,
        toDate,
        includeCharges,
        includeOtherLogs,
        includeExpenses,
        includeEmptyDays,
        viewMode,
        weekStart,
        search: search?.trim() ? search.trim() : undefined,
        enabled: load && reportType === "LOAN_LEDGER",
    });

    const data = reportType === "PASSBOOK" ? passbookQ.data : loanLedgerQ.data;
    const reportLoading = reportType === "PASSBOOK" ? passbookQ.isLoading : loanLedgerQ.isLoading;
    const reportFetching = reportType === "PASSBOOK" ? passbookQ.isFetching : loanLedgerQ.isFetching;
    const error = reportType === "PASSBOOK" ? passbookQ.error : loanLedgerQ.error;

    const summary = useMemo(() => {
        if (reportType === "PASSBOOK") {
            const tx = data?.transactions || [];
            const totalCredit = tx.reduce((s, r) => s + Number(r.credit || 0), 0);
            const totalDebit = tx.reduce((s, r) => s + Number(r.debit || 0), 0);
            const opening = Number(data?.opening_balance || 0);
            const closing = opening + (totalCredit - totalDebit);
            return {opening, totalCredit, totalDebit, closing};
        }
        const opening = Number(data?.opening_balance || 0);
        const closing = Number(data?.closing_balance || 0);
        const rows = Array.isArray(data?.summary_rows) ? data.summary_rows : [];
        const totalCredit = rows.reduce((s, r) => s + Number(r.credit_total || 0), 0);
        const totalDebit = rows.reduce((s, r) => s + Number(r.debit_total || 0), 0);
        return {opening, totalCredit, totalDebit, closing};
    }, [data, reportType]);

    const setThisMonth = () => {
        const {from, to} = getMonthRange(new Date());
        setFromDate(from);
        setToDate(to);
        setLoad(false);
    };

    const txCount =
        reportType === "PASSBOOK"
            ? (Array.isArray(data?.transactions) ? data.transactions.length : 0)
            : (Array.isArray(data?.rows) ? data.rows.length : 0);

    const passbookColumns = useMemo(() => ([
        {
            key: "txn_date",
            header: "Date",
            cell: (r) => String(r.txn_date).slice(0, 10),
            exportValue: (r) => String(r.txn_date).slice(0, 10),
            sortValue: (r) => String(r.txn_date).slice(0, 10)
        },
        {
            key: "source",
            header: "Source",
            cell: (r) => r.source,
            exportValue: (r) => r.source,
            sortValue: (r) => r.source
        },
        {
            key: "credit",
            header: "Credit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.credit)}`,
            exportValue: (r) => Number(r.credit || 0),
            sortValue: (r) => Number(r.credit || 0)
        },
        {
            key: "debit",
            header: "Debit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.debit)}`,
            exportValue: (r) => Number(r.debit || 0),
            sortValue: (r) => Number(r.debit || 0)
        },
        {
            key: "net",
            header: "Net",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.net)}`,
            exportValue: (r) => Number(r.net || 0),
            sortValue: (r) => Number(r.net || 0)
        },
        {
            key: "running_balance",
            header: "Running",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.running_balance)}`,
            exportValue: (r) => Number(r.running_balance || 0),
            sortValue: (r) => Number(r.running_balance || 0)
        },
        {
            key: "remark",
            header: "Remark",
            cell: (r) => r.remark,
            exportValue: (r) => r.remark,
            sortValue: (r) => r.remark
        },
    ]), []);

    const loanSummaryColumns = useMemo(() => ([
        {
            key: "d",
            header: viewMode === "WEEKLY" ? "Week" : "Date",
            cell: (r) => {
                if (viewMode === "WEEKLY") {
                    const ws = r.week_start_date || r.week_start || r.week_first_day;
                    const we = r.week_last_day;
                    return we ? `${String(ws).slice(0, 10)} → ${String(we).slice(0, 10)}` : String(ws).slice(0, 10);
                }
                return String(r.d).slice(0, 10);
            },
            exportValue: (r) => (viewMode === "WEEKLY" ? (r.week_start_date || r.week_start || r.week_first_day) : r.d),
            sortValue: (r) => String(viewMode === "WEEKLY" ? (r.week_start_date || r.week_start || r.week_first_day) : r.d),
        },
        {
            key: "opening_balance",
            header: "Opening",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.opening_balance)}`,
            exportValue: (r) => Number(r.opening_balance || 0),
            sortValue: (r) => Number(r.opening_balance || 0)
        },
        {
            key: "credit_total",
            header: "Credit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.credit_total)}`,
            exportValue: (r) => Number(r.credit_total || 0),
            sortValue: (r) => Number(r.credit_total || 0)
        },
        {
            key: "debit_total",
            header: "Debit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.debit_total)}`,
            exportValue: (r) => Number(r.debit_total || 0),
            sortValue: (r) => Number(r.debit_total || 0)
        },
        {
            key: "net",
            header: "Net",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.net)}`,
            exportValue: (r) => Number(r.net || 0),
            sortValue: (r) => Number(r.net || 0)
        },
        {
            key: "closing_balance",
            header: "Closing",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.closing_balance)}`,
            exportValue: (r) => Number(r.closing_balance || 0),
            sortValue: (r) => Number(r.closing_balance || 0)
        },
    ]), [viewMode]);

    const loanRowsColumns = useMemo(() => ([
        {
            key: "created_on",
            header: "Created (IST)",
            thClassName: "w-[190px]",
            tdClassName: "w-[190px] whitespace-nowrap",
            cell: (r) => formatDateTimeIST(r.created_on),
            exportValue: (r) => r.created_on,
            sortValue: (r) => r.created_on,
        },
        {key: "txn_type", header: "Type", cell: (r) => r.txn_type, exportValue: (r) => r.txn_type},
        {
            key: "loan_account_no",
            header: "Loan A/C",
            cell: (r) => r.loan_account_no || "-",
            exportValue: (r) => r.loan_account_no || ""
        },
        {key: "group_name", header: "Group", cell: (r) => r.group_name || "-", exportValue: (r) => r.group_name || ""},
        {
            key: "member_name",
            header: "Member",
            cell: (r) => r.member_name || "-",
            exportValue: (r) => r.member_name || ""
        },
        {
            key: "credit",
            header: "Credit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.credit)}`,
            exportValue: (r) => Number(r.credit || 0),
            sortValue: (r) => Number(r.credit || 0)
        },
        {
            key: "debit",
            header: "Debit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.debit)}`,
            exportValue: (r) => Number(r.debit || 0),
            sortValue: (r) => Number(r.debit || 0)
        },
        {key: "narration", header: "Narration", cell: (r) => r.narration, exportValue: (r) => r.narration},
        {key: "row_source", header: "Source", cell: (r) => r.row_source, exportValue: (r) => r.row_source},
    ]), []);

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-2xl font-semibold">Branch Reports</div>
                    <div className="text-sm text-muted-foreground">
                        {reportType === "PASSBOOK" ? "Branch passbook" : "Branch cashbook (loan ledger + expenses)"}
                    </div>
                </div>

                {/* Report Tabs */}
                <Tabs value={reportType} onValueChange={(v) => {
                    setReportType(v);
                    setLoad(false);
                }}>
                    <TabsList>
                        <TabsTrigger value="LOAN_LEDGER">Cashbook</TabsTrigger>
                        <TabsTrigger value="PASSBOOK">Passbook</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Filters Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Filters</CardTitle>
                    <CardDescription>Choose branch + date range and load report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Top row */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="space-y-2 md:col-span-5">
                            <Label>Branch</Label>
                            {branchesLoading ? (
                                <Skeleton className="h-10 w-full"/>
                            ) : (
                                <Select
                                    value={branchId}
                                    onValueChange={(v) => {
                                        setBranchId(v);
                                        setLoad(false);
                                    }}
                                    disabled={isBranchManager || (!canPickAnyBranch && !!myBranchId)}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select branch"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branchOptions.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {isBranchManager ? (
                                <div className="text-xs text-muted-foreground">Branch is locked for Branch Manager
                                    role.</div>
                            ) : null}
                        </div>

                        <div className="space-y-2 md:col-span-3">
                            <Label>From</Label>
                            <Input type="date" value={fromDate} max={toDate || undefined}
                                   onChange={(e) => {
                                       setFromDate(e.target.value);
                                       setLoad(false);
                                   }}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-3">
                            <Label>To</Label>
                            <Input type="date" value={toDate} min={fromDate || undefined} max={maxToDate || undefined}
                                   onChange={(e) => {
                                       setToDate(e.target.value);
                                       setLoad(false);
                                   }}
                            />
                            <div className="text-xs text-muted-foreground">Max range: 1 year (365 days)</div>
                        </div>

                        <div className="flex gap-2 md:col-span-1 md:flex-col md:items-stretch md:justify-end">
                            <Button variant="outline" className="h-10 w-full" onClick={setThisMonth}
                                    disabled={reportLoading || reportFetching}>
                                This Month
                            </Button>
                            <Button className="h-10 w-full" onClick={() => setLoad(true)}
                                    disabled={!canLoad || reportLoading || reportFetching}>
                                {reportLoading || reportFetching ? "Loading…" : "Load"}
                            </Button>
                        </div>
                    </div>

                    {/* Extra filters only for Cashbook */}
                    {reportType === "LOAN_LEDGER" && (
                        <>
                            <Separator/>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                                <div className="space-y-2 md:col-span-5">
                                    <Label>Search</Label>
                                    <Input
                                        placeholder="Narration / Loan / Member / Group"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setLoad(false);
                                        }}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label>View Mode</Label>
                                    <Select
                                        value={viewMode}
                                        onValueChange={(v) => {
                                            setViewMode(v);
                                            setLoad(false);
                                        }}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DAILY">Daily</SelectItem>
                                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label>Week Start</Label>
                                    <Select
                                        value={weekStart}
                                        onValueChange={(v) => {
                                            setWeekStart(v);
                                            setLoad(false);
                                        }}
                                        disabled={viewMode !== "WEEKLY"}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MON">Mon</SelectItem>
                                            <SelectItem value="SUN">Sun</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-3">
                                    <Label>Include</Label>
                                    <div className="mt-2 grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span className="text-sm">Charges</span>
                                            <Switch checked={includeCharges} onCheckedChange={(v) => {
                                                setIncludeCharges(v);
                                                setLoad(false);
                                            }}/>
                                        </div>
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span className="text-sm">Expenses</span>
                                            <Switch checked={includeExpenses} onCheckedChange={(v) => {
                                                setIncludeExpenses(v);
                                                setLoad(false);
                                            }}/>
                                        </div>
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span className="text-sm">Other Logs</span>
                                            <Switch checked={includeOtherLogs} onCheckedChange={(v) => {
                                                setIncludeOtherLogs(v);
                                                setLoad(false);
                                            }}/>
                                        </div>
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span className="text-sm">Empty Days</span>
                                            <Switch checked={includeEmptyDays} onCheckedChange={(v) => {
                                                setIncludeEmptyDays(v);
                                                setLoad(false);
                                            }}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Summary KPI row */}
            {data && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <Kpi label="Opening" value={`₹${formatINR(summary.opening)}`}/>
                    <Kpi label="Total Credit" value={`₹${formatINR(summary.totalCredit)}`}/>
                    <Kpi label="Total Debit" value={`₹${formatINR(summary.totalDebit)}`}/>
                    <Kpi label="Closing" value={`₹${formatINR(summary.closing)}`}/>
                    <Kpi label="Transactions" value={txCount} subtle/>
                </div>
            )}

            {/* Error */}
            {error ? (
                <div
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    Failed to load report. Check branch/date filters and backend logs.
                </div>
            ) : null}

            {/* Tables */}
            {reportType === "PASSBOOK" ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Passbook</CardTitle>
                        <CardDescription>{`Branch ${branchId || "-"} | ${fromDate} to ${toDate}`}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AdvancedTable
                            title=""
                            description=""
                            data={data?.transactions || []}
                            columns={passbookColumns}
                            isLoading={reportLoading || reportFetching}
                            emptyText="No transactions found for this date range."
                            initialPageSize={10}
                            enableSearch
                            enablePagination
                            enableColumnToggle
                            enableExport
                            exportFileName={`branch_passbook_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                            exportSheetName="Passbook"
                            exportScope="all"
                            exportVisibleOnly={true}
                            exportTitleRow={`Branch Passbook (${fromDate} to ${toDate})`}
                            exportMetaRows={[
                                ["Branch ID", branchId || ""],
                                ["From", fromDate],
                                ["To", toDate],
                                ["Opening Balance", summary.opening],
                                ["Total Credit", summary.totalCredit],
                                ["Total Debit", summary.totalDebit],
                                ["Closing Balance", summary.closing],
                                ["Transactions", txCount],
                            ]}
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle
                                className="text-base">{viewMode === "WEEKLY" ? "Weekly Summary" : "Daily Summary"}</CardTitle>
                            <CardDescription>{`Branch ${branchId || "-"} | ${fromDate} to ${toDate}`}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AdvancedTable
                                title=""
                                description=""
                                data={data?.summary_rows || []}
                                columns={loanSummaryColumns}
                                isLoading={reportLoading || reportFetching}
                                emptyText="No summary rows for this range."
                                initialPageSize={10}
                                enableSearch={false}
                                enablePagination
                                enableColumnToggle
                                enableExport
                                exportFileName={`branch_cashbook_summary_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                                exportSheetName={viewMode === "WEEKLY" ? "Weekly" : "Daily"}
                                exportScope="all"
                                exportVisibleOnly={true}
                                exportTitleRow={`Branch Cashbook Summary (${fromDate} to ${toDate})`}
                                exportMetaRows={[
                                    ["Branch ID", branchId || ""],
                                    ["From", fromDate],
                                    ["To", toDate],
                                    ["View Mode", viewMode],
                                    ["Week Start", weekStart],
                                    ["Include Charges", includeCharges ? "Yes" : "No"],
                                    ["Include Expenses", includeExpenses ? "Yes" : "No"],
                                    ["Include Other Logs", includeOtherLogs ? "Yes" : "No"],
                                    ["Include Empty Days", includeEmptyDays ? "Yes" : "No"],
                                    ["Opening Balance", summary.opening],
                                    ["Closing Balance", summary.closing],
                                ]}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base">Detailed Entries</CardTitle>
                                    <CardDescription>{`Loan ledger + expenses (limit ${data?.limit || 200})`}</CardDescription>
                                </div>
                                <Badge
                                    variant="secondary">Rows: {Array.isArray(data?.rows) ? data.rows.length : 0}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <AdvancedTable
                                title=""
                                description=""
                                data={data?.rows || []}
                                columns={loanRowsColumns}
                                isLoading={reportLoading || reportFetching}
                                emptyText="No entries found for this date range."
                                initialPageSize={10}
                                enableSearch
                                enablePagination
                                enableColumnToggle
                                enableExport
                                exportFileName={`branch_cashbook_rows_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                                exportSheetName="Rows"
                                exportScope="all"
                                exportVisibleOnly={true}
                                exportTitleRow={`Branch Cashbook Rows (${fromDate} to ${toDate})`}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
