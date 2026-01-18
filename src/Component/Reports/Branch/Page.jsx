// src/Component/Reports/BranchReportsPage.jsx
import React, {useMemo, useState} from "react";
import {useBranchCashbookPassbook} from "@/hooks/useReports";
import {useBranches} from "@/hooks/useBranches";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Badge} from "@/components/ui/badge";

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
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function getMonthRange(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
    return {from: toYmd(start), to: toYmd(end)};
}

function formatINR(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-IN", {maximumFractionDigits: 2});
}

function isPrivilegedBranchPicker(role) {
    const r = (role || "").toString().trim().toLowerCase();
    return ["super_admin", "admin", "region_manager", "regional_manager"].includes(r);
}

export default function BranchReportsPage() {
    const {from: defaultFrom, to: defaultTo} = useMemo(() => getMonthRange(), []);

    const role = useMemo(() => getUserRole(), []);
    const myBranchId = useMemo(() => getUserBranchId(), []);

    const canPickAnyBranch = isPrivilegedBranchPicker(role);
    const isBranchManager = (role || "").toLowerCase() === "branch_manager";

    const [branchId, setBranchId] = useState(isBranchManager && myBranchId ? String(myBranchId) : "");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [load, setLoad] = useState(false);

    const {branches, isLoading: branchesLoading} = useBranches(null);

    const branchOptions = useMemo(() => {
        const opts = (branches || []).map((b) => {
            const id = b.branch_id ?? b.id;
            const name = b.branch_name ?? b.name ?? `Branch ${id}`;
            return {id: String(id), name};
        });

        // ✅ branch_manager: only their branch
        if (isBranchManager && myBranchId) {
            return opts.filter((x) => x.id === String(myBranchId));
        }

        // ✅ super_admin / region_manager: any branch
        if (canPickAnyBranch) return opts;

        // ✅ fallback: if user has branch_id, restrict
        if (myBranchId) return opts.filter((x) => x.id === String(myBranchId));
        return opts;
    }, [branches, isBranchManager, myBranchId, canPickAnyBranch]);

    // ✅ auto-select if only one branch, or force for branch manager
    React.useEffect(() => {
        if (isBranchManager && myBranchId) {
            setBranchId(String(myBranchId));
            return;
        }
        if (!branchId && branchOptions.length === 1) {
            setBranchId(branchOptions[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchOptions.length, isBranchManager, myBranchId]);

    // ✅ enforce max 1 year range (365 days)
    React.useEffect(() => {
        if (!fromDate || !toDate) return;

        // if to < from, fix it
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

    const {data, isLoading: reportLoading, isFetching: reportFetching, error} =
        useBranchCashbookPassbook({
            branchId,
            fromDate,
            toDate,
            enabled: load,
        });

    const summary = useMemo(() => {
        const tx = data?.transactions || [];
        const totalCredit = tx.reduce((s, r) => s + Number(r.credit || 0), 0);
        const totalDebit = tx.reduce((s, r) => s + Number(r.debit || 0), 0);

        const opening = Number(data?.opening_balance || 0);
        const closing = opening + (totalCredit - totalDebit);

        return {opening, totalCredit, totalDebit, closing};
    }, [data]);

    const setThisMonth = () => {
        const {from, to} = getMonthRange(new Date());
        setFromDate(from);
        setToDate(to);
        setLoad(false);
    };

    const columns = useMemo(() => ([
        {
            key: "txn_date",
            header: "Date",
            cell: (r) => String(r.txn_date).slice(0, 10),
            exportValue: (r) => String(r.txn_date).slice(0, 10),
            sortValue: (r) => String(r.txn_date).slice(0, 10),
        },
        {
            key: "source",
            header: "Source",
            cell: (r) => r.source,
            exportValue: (r) => r.source,
            sortValue: (r) => r.source,
        },
        {
            key: "credit",
            header: "Credit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.credit)}`,
            exportValue: (r) => Number(r.credit || 0),
            sortValue: (r) => Number(r.credit || 0),
        },
        {
            key: "debit",
            header: "Debit",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.debit)}`,
            exportValue: (r) => Number(r.debit || 0),
            sortValue: (r) => Number(r.debit || 0),
        },
        {
            key: "net",
            header: "Net",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.net)}`,
            exportValue: (r) => Number(r.net || 0),
            sortValue: (r) => Number(r.net || 0),
        },
        {
            key: "running_balance",
            header: "Running",
            className: "text-right",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
            cell: (r) => `₹${formatINR(r.running_balance)}`,
            exportValue: (r) => Number(r.running_balance || 0),
            sortValue: (r) => Number(r.running_balance || 0),
        },
        {
            key: "remark",
            header: "Remark",
            cell: (r) => r.remark,
            exportValue: (r) => r.remark,
            sortValue: (r) => r.remark,
        },
    ]), []);

    const txCount = Array.isArray(data?.transactions) ? data.transactions.length : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Branch Reports</CardTitle>
                <CardDescription>Branch cashbook passbook</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* ================= Filters ================= */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    {/* Branch dropdown */}
                    <div className="space-y-2 md:col-span-2">
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
                                disabled={isBranchManager || (!canPickAnyBranch && !!myBranchId)} // ✅ lock for branch_manager
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select branch"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {branchOptions.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {isBranchManager ? (
                            <div className="text-xs text-muted-foreground">
                                Branch is locked for Branch Manager role.
                            </div>
                        ) : null}
                    </div>

                    {/* From date */}
                    <div className="space-y-2">
                        <Label>From</Label>
                        <Input
                            type="date"
                            value={fromDate}
                            max={toDate || undefined}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setLoad(false);
                            }}
                        />
                    </div>

                    {/* To date */}
                    <div className="space-y-2">
                        <Label>To</Label>
                        <Input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            max={maxToDate || undefined} // ✅ 1 year limit
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setLoad(false);
                            }}
                        />
                        <div className="text-xs text-muted-foreground">
                            Max range: 1 year (365 days)
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-2 flex items-end gap-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={setThisMonth}
                            disabled={reportLoading || reportFetching}
                        >
                            This Month
                        </Button>

                        <Button
                            className="w-full"
                            onClick={() => setLoad(true)}
                            disabled={!canLoad || reportLoading || reportFetching}
                        >
                            {reportLoading || reportFetching ? "Loading..." : "Load"}
                        </Button>
                    </div>
                </div>

                {/* ================= Summary ================= */}
                {data && (
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                            Opening Balance: ₹{formatINR(summary.opening)}
                        </Badge>
                        <Badge variant="outline">
                            Total Credit: ₹{formatINR(summary.totalCredit)}
                        </Badge>
                        <Badge variant="outline">
                            Total Debit: ₹{formatINR(summary.totalDebit)}
                        </Badge>
                        <Badge variant="secondary">
                            Closing Balance: ₹{formatINR(summary.closing)}
                        </Badge>
                        <Badge variant="outline">
                            Transactions: {txCount}
                        </Badge>
                    </div>
                )}

                {/* ================= Table (AdvancedTable) ================= */}
                <AdvancedTable
                    title="Cashbook / Passbook"
                    description={`Branch ${branchId || "-"} | ${fromDate} to ${toDate}`}
                    data={data?.transactions || []}
                    columns={columns}
                    isLoading={reportLoading || reportFetching}
                    errorText={error ? "Failed to load report. Check branch/date filters." : ""}
                    emptyText="No transactions found for this date range."
                    initialPageSize={10}
                    enableSearch
                    enablePagination
                    enableColumnToggle

                    // ✅ Excel Export
                    enableExport
                    exportFileName={`branch_cashbook_passbook_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                    exportSheetName="CashbookPassbook"
                    exportScope="all"
                    exportVisibleOnly={true}
                    exportTitleRow={`Branch Cashbook/Passbook (${fromDate} to ${toDate})`}

                    // ✅ put opening + totals inside excel
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
    );
}
