// src/Component/Reports/GroupReportsPage.jsx
import React, {useMemo, useState} from "react";
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

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {useGroups} from "@/hooks/useGroups"; // ✅ assumes you already have this
import {useGroupCashbookPassbook} from "@/hooks/useReports";
import {getUserRole, getUserBranchId} from "@/hooks/useApi";

/* ================= helpers ================= */
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
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {from: toYmd(start), to: toYmd(end)};
}

function formatINR(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-IN", {maximumFractionDigits: 2});
}

function isPrivileged(role) {
    const r = (role || "").toString().trim().toLowerCase();
    return ["super_admin", "admin", "region_manager", "regional_manager"].includes(r);
}

/**
 * ✅ Branch restriction logic:
 * - super_admin/admin/region_manager: can select any group (no branch filter)
 * - branch_manager: can select only groups inside their branch
 *
 * For this we assume `useGroups({ branchId })` exists.
 * If your hook is different, just adjust the `useGroups(...)` call.
 */
export default function GroupReportsPage() {
    const {from: defaultFrom, to: defaultTo} = useMemo(() => getMonthRange(), []);

    const role = useMemo(() => getUserRole(), []);
    const myBranchId = useMemo(() => getUserBranchId(), []);

    const privileged = isPrivileged(role);
    const isBranchManager = (role || "").toLowerCase() === "branch_manager";

    // ✅ filters
    const [groupId, setGroupId] = useState("");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [includeCharges, setIncludeCharges] = useState(true);
    const [load, setLoad] = useState(false);

    // ✅ groups list (filtered by branch for branch manager)
    const groupsQueryArgs = useMemo(() => {
        if (isBranchManager && myBranchId) return {branchId: myBranchId};
        return {branchId: null};
    }, [isBranchManager, myBranchId]);

    const {groups, isLoading: groupsLoading} = useGroups(groupsQueryArgs);

    const groupOptions = useMemo(() => {
        return (groups || []).map((g) => {
            const id = g.group_id ?? g.id;
            const name = g.group_name ?? g.name ?? `Group ${id}`;
            const branch = g.branch_name ?? g.branch ?? "";
            return {
                id: String(id),
                name: branch ? `${name} (${branch})` : name,
            };
        });
    }, [groups]);

    // ✅ auto select if only one group
    React.useEffect(() => {
        if (!groupId && groupOptions.length === 1) {
            setGroupId(groupOptions[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupOptions.length]);

    // ✅ enforce max 1 year range
    React.useEffect(() => {
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
    const canLoad = !!groupId && !!fromDate && !!toDate;

    const {
        data,
        isLoading: reportLoading,
        isFetching: reportFetching,
        error,
    } = useGroupCashbookPassbook({
        groupId,
        fromDate,
        toDate,
        includeCharges,
        enabled: load,
    });

    const tx = data?.transactions || [];

    const summary = useMemo(() => {
        const totalCredit = tx.reduce((s, r) => s + Number(r.credit || 0), 0);
        const totalDebit = tx.reduce((s, r) => s + Number(r.debit || 0), 0);

        const opening = Number(data?.opening_balance || 0);
        const closing = opening + (totalCredit - totalDebit);

        return {opening, totalCredit, totalDebit, closing};
    }, [data, tx]);

    const txCount = Array.isArray(tx) ? tx.length : 0;

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Reports</CardTitle>
                <CardDescription>Group cashbook passbook</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* ================= Filters ================= */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                    {/* Group dropdown */}
                    <div className="space-y-2 md:col-span-2">
                        <Label>Group</Label>

                        {groupsLoading ? (
                            <Skeleton className="h-10 w-full"/>
                        ) : (
                            <Select
                                value={groupId}
                                onValueChange={(v) => {
                                    setGroupId(v);
                                    setLoad(false);
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select group"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {groupOptions.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>
                                            {g.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {!privileged && isBranchManager ? (
                            <div className="text-xs text-muted-foreground">
                                Showing groups for your branch only.
                            </div>
                        ) : null}
                    </div>

                    {/* From */}
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

                    {/* To */}
                    <div className="space-y-2">
                        <Label>To</Label>
                        <Input
                            type="date"
                            value={toDate}
                            min={fromDate || undefined}
                            max={maxToDate || undefined}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setLoad(false);
                            }}
                        />
                        <div className="text-xs text-muted-foreground">Max range: 1 year (365 days)</div>
                    </div>

                    {/* Include charges */}
                    <div className="space-y-2">
                        <Label>Charges</Label>
                        <div className="h-10 flex items-center gap-2 rounded-md border px-3">
                            <input
                                id="includeCharges"
                                type="checkbox"
                                checked={includeCharges}
                                onChange={(e) => {
                                    setIncludeCharges(e.target.checked);
                                    setLoad(false);
                                }}
                            />
                            <label htmlFor="includeCharges" className="text-sm">
                                Include charges
                            </label>
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

                {/* ================= Table ================= */}
                <AdvancedTable
                    title="Group Cashbook / Passbook"
                    description={`Group ${groupId || "-"} | ${fromDate} to ${toDate} | Charges: ${includeCharges ? "Yes" : "No"}`}
                    data={tx}
                    columns={columns}
                    isLoading={reportLoading || reportFetching}
                    errorText={error ? "Failed to load report. Check group/date filters." : ""}
                    emptyText="No transactions found for this date range."
                    initialPageSize={10}
                    enableSearch
                    enablePagination
                    enableColumnToggle

                    enableExport
                    exportFileName={`group_cashbook_passbook_${groupId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                    exportSheetName="GroupCashbookPassbook"
                    exportScope="all"
                    exportVisibleOnly={true}
                    exportTitleRow={`Group Cashbook/Passbook (${fromDate} to ${toDate})`}

                    exportMetaRows={[
                        ["Group ID", groupId || ""],
                        ["From", fromDate],
                        ["To", toDate],
                        ["Include Charges", includeCharges ? "Yes" : "No"],
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
