// src/pages/loans/LoanDueSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
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

import {RefreshCw, Calendar as CalendarIcon, Eye} from "lucide-react";

import {useDueInstallments} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

const TH = "px-3 py-3 text-center align-middle whitespace-nowrap";
const TD = "px-3 py-3 align-middle whitespace-nowrap";
const TD_LEFT = "px-3 py-3 align-middle whitespace-normal";

/** ✅ Robust amount extractor (handles many possible backend keys) */
function getAmountDue(row) {
    if (!row) return null;

    // direct common keys
    const directCandidates = [
        row.amount_due,
        row.due_amount,
        row.installment_amount_due,
        row.installment_due_amount,
        row.installment_amount,
        row.emi_amount,
        row.emi,
        row.amount,
        row.due,
        row.total_due,
        row.total_amount,
    ];

    for (const v of directCandidates) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
    }

    // if backend splits principal + interest
    const p = Number(row.principal_due ?? row.principal_component ?? row.principal ?? 0);
    const i = Number(row.interest_due ?? row.interest_component ?? row.interest ?? 0);
    const sum = p + i;
    if (Number.isFinite(sum) && sum > 0) return sum;

    // nested objects (just in case)
    const nested =
        row.installment?.amount_due ??
        row.installment?.amount ??
        row.next_installment?.due_amount ??
        row.next_installment?.amount ??
        row.schedule?.amount_due ??
        row.schedule?.amount;

    const nn = Number(nested);
    if (Number.isFinite(nn) && nn > 0) return nn;

    return null;
}

function formatMoney(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function LoanDueSection({onOpenSummary}) {
    // ----------------------------
    // Default date = today (YYYY-MM-DD)
    // ----------------------------
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // draft + applied date
    const [asOnDraft, setAsOnDraft] = useState(today);
    const [asOnApplied, setAsOnApplied] = useState(today);

    // optional LO filter (frontend filter)
    const [loDraft, setLoDraft] = useState("ALL");

    // LO data
    const loQ = useLoanOfficers();

    const loOptions = useMemo(() => {
        const list = loQ.loanOfficers || [];
        return list.map((x) => ({
            lo_id: x.lo_id,
            label: x?.employee?.full_name
                ? `${x.employee.full_name} (LO-${x.lo_id})`
                : `LO-${x.lo_id}`,
        }));
    }, [loQ.loanOfficers]);

    const loNameMap = useMemo(() => {
        const map = {};
        (loQ.loanOfficers || []).forEach((x) => {
            map[String(x.lo_id)] = x?.employee?.full_name || `LO-${x.lo_id}`;
        });
        return map;
    }, [loQ.loanOfficers]);

    // Due installments API (expects as_on)
    const dueQ = useDueInstallments(asOnApplied);

    // Normalize rows
    const rows = useMemo(() => {
        const d = dueQ.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.results)) return d.results;
        return [];
    }, [dueQ.data]);

    // Optional frontend filter by LO (only if row includes lo_id)
    const filteredRows = useMemo(() => {
        if (loDraft === "ALL") return rows;
        return rows.filter(
            (r) => String(r.lo_id ?? r.loan_officer_id ?? "") === String(loDraft)
        );
    }, [rows, loDraft]);

    // Summary counts
    const summary = useMemo(() => {
        const total = filteredRows.length;

        // ✅ Use robust getAmountDue to compute totals
        const totalDueAmount = filteredRows.reduce((sum, r) => {
            const amt = getAmountDue(r);
            return sum + (amt || 0);
        }, 0);

        return {total, totalDueAmount};
    }, [filteredRows]);

    const applyAsOn = () => {
        setAsOnApplied(asOnDraft || today);
    };

    return (
        <Card className="rounded-xl">
            <CardHeader className="space-y-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle>Installments Due</CardTitle>
                        <CardDescription>View all due installments as on a selected date.</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => dueQ.refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters row */}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                    {/* As On Date */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                                type="date"
                                value={asOnDraft}
                                onChange={(e) => setAsOnDraft(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {/* LO filter (frontend filter) */}
                    <Select value={loDraft} onValueChange={setLoDraft}>
                        <SelectTrigger className="lg:col-span-2">
                            <SelectValue
                                placeholder={loQ.isLoading ? "Loading Loan Officers..." : "Loan Officer"}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Loan Officers</SelectItem>

                            {loQ.isLoading ? (
                                <div className="px-3 py-2">
                                    <Skeleton className="h-4 w-full"/>
                                </div>
                            ) : loQ.isError ? (
                                <div className="px-3 py-2 text-sm text-destructive">
                                    Failed to load Loan Officers
                                </div>
                            ) : (
                                loOptions.map((o) => (
                                    <SelectItem key={o.lo_id} value={String(o.lo_id)}>
                                        {o.label}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    {/* Apply */}
                    <div className="flex items-center gap-2 lg:col-span-2">
                        <Button onClick={applyAsOn} className="w-full md:w-auto">
                            Apply
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full md:w-auto"
                            onClick={() => {
                                setAsOnDraft(today);
                                setAsOnApplied(today);
                                setLoDraft("ALL");
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="secondary">
                        Total Due: <span className="ml-1 font-semibold">{summary.total}</span>
                    </Badge>
                    <Badge variant="secondary">
                        Total Amount:{" "}
                        <span className="ml-1 font-semibold">{formatMoney(summary.totalDueAmount)}</span>
                    </Badge>
                    <Badge variant="outline">
                        As On: <span className="ml-1 font-semibold">{asOnApplied}</span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div className="w-full overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                        <tr>
                            <th className={TH}>Loan ID</th>
                            <th className={TH}>Member</th>
                            <th className={TH}>Group</th>
                            <th className={TH}>Loan Officer</th>
                            <th className={TH}>Due Date</th>
                            <th className={TH}>Inst. No</th>
                            <th className={TH}>Amount Due</th>
                            <th className={TH}>Action</th>
                        </tr>
                        </thead>

                        <tbody>
                        {dueQ.isLoading ? (
                            Array.from({length: 8}).map((_, i) => (
                                <tr key={i} className="border-t">
                                    {Array.from({length: 8}).map((__, j) => (
                                        <td key={j} className={TD}>
                                            <Skeleton className="h-4 w-24 mx-auto"/>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filteredRows.length === 0 ? (
                            <tr className="border-t">
                                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                                    No due installments found.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((r, idx) => {
                                const loanId = r.loan_id ?? r.id ?? r.loan_no ?? "-";
                                const member = r.member_name ?? r.member ?? r.member_full_name ?? "-";
                                const group = r.group_name ?? r.group ?? "-";

                                const loIdValue = r.lo_id ?? r.loan_officer_id ?? null;
                                const loName =
                                    r.lo_name ??
                                    r.loan_officer_name ??
                                    (loIdValue != null ? loNameMap[String(loIdValue)] || `LO-${loIdValue}` : "-");

                                const dueDate = r.due_date ?? r.installment_due_date ?? r.date ?? "-";

                                const instNo =
                                    r.installment_no ??
                                    r.installment_number ??
                                    r.emi_no ??
                                    r.week_no ??
                                    r.week_number ??
                                    (idx + 1);

                                // ✅ FIX: compute amount due robustly
                                const amountDue = getAmountDue(r);

                                return (
                                    <tr key={`${loanId}-${instNo}-${dueDate}`} className="border-t hover:bg-muted/20">
                                        <td className={TD_LEFT}>
                                            <div className="font-medium">{loanId}</div>
                                        </td>
                                        <td className={TD_LEFT}>{member}</td>
                                        <td className={TD_LEFT}>{group}</td>
                                        <td className={TD_LEFT}>{String(loName)}</td>
                                        <td className={TD}>{String(dueDate)}</td>
                                        <td className={TD}>{String(instNo)}</td>
                                        <td className={TD}>
                                            {amountDue == null ? "-" : formatMoney(amountDue)}
                                        </td>
                                        <td className={TD}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onOpenSummary?.(loanId)}
                                            >
                                                <Eye className="h-4 w-4 mr-2"/>
                                                Summary
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
