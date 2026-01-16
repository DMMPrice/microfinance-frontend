// src/Component/Reports/BranchReportsPage.jsx
import React, {useMemo, useState} from "react";
import {useBranchCashbookPassbook} from "@/hooks/useReports";
import {useBranches} from "@/hooks/useBranches";

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

/* ✅ helpers */
function pad2(n) {
    return String(n).padStart(2, "0");
}

function toYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

export default function BranchReportsPage() {
    // ✅ default month range from system date
    const {from: defaultFrom, to: defaultTo} = useMemo(() => getMonthRange(), []);

    const [branchId, setBranchId] = useState("");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [load, setLoad] = useState(false);

    const {branches, isLoading: branchesLoading} = useBranches(null);

    const branchOptions = useMemo(() => {
        return (branches || []).map((b) => {
            const id = b.branch_id ?? b.id;
            const name = b.branch_name ?? b.name ?? `Branch ${id}`;
            return {id: String(id), name};
        });
    }, [branches]);

    const {data, isLoading: reportLoading, isFetching: reportFetching, error} =
        useBranchCashbookPassbook({
            branchId,
            fromDate,
            toDate,
            enabled: load,
        });

    const canLoad = !!branchId && !!fromDate && !!toDate;

    // ✅ BM: auto-select if only one branch
    React.useEffect(() => {
        if (!branchId && branchOptions.length === 1) {
            setBranchId(branchOptions[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchOptions.length]);

    const setThisMonth = () => {
        const {from, to} = getMonthRange(new Date());
        setFromDate(from);
        setToDate(to);
        setLoad(false);
    };

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
                    </div>

                    {/* From date */}
                    <div className="space-y-2">
                        <Label>From</Label>
                        <Input
                            type="date"
                            value={fromDate}
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
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setLoad(false);
                            }}
                        />
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
                            Opening Balance: ₹{formatINR(data.opening_balance)}
                        </Badge>
                        <Badge variant="outline">
                            Transactions: {Array.isArray(data.transactions) ? data.transactions.length : 0}
                        </Badge>
                    </div>
                )}

                {/* ================= Errors / Loading ================= */}
                {(reportLoading || reportFetching) && (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive">
                        Failed to load report. Check branch/date filters.
                    </div>
                )}

                {/* ================= Table ================= */}
                {data?.transactions?.length > 0 && (
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                            <tr className="text-left">
                                <th className="p-3 whitespace-nowrap">Date</th>
                                <th className="p-3 whitespace-nowrap">Source</th>
                                <th className="p-3 whitespace-nowrap text-right">Credit</th>
                                <th className="p-3 whitespace-nowrap text-right">Debit</th>
                                <th className="p-3 whitespace-nowrap text-right">Net</th>
                                <th className="p-3 whitespace-nowrap text-right">Running</th>
                                <th className="p-3 min-w-[420px]">Remark</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.transactions.map((r, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="p-3 whitespace-nowrap">{String(r.txn_date).slice(0, 10)}</td>
                                    <td className="p-3 whitespace-nowrap">{r.source}</td>
                                    <td className="p-3 whitespace-nowrap text-right">₹{formatINR(r.credit)}</td>
                                    <td className="p-3 whitespace-nowrap text-right">₹{formatINR(r.debit)}</td>
                                    <td className="p-3 whitespace-nowrap text-right">₹{formatINR(r.net)}</td>
                                    <td className="p-3 whitespace-nowrap text-right">₹{formatINR(r.running_balance)}</td>
                                    <td className="p-3">{r.remark}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data && (!data.transactions || data.transactions.length === 0) && (
                    <div className="text-sm text-muted-foreground">No transactions found for this date range.</div>
                )}
            </CardContent>
        </Card>
    );
}
