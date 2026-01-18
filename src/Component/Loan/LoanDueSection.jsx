// src/Component/Loan/LoanDueSection.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";

import {RefreshCw, Calendar as CalendarIcon, Eye} from "lucide-react";

import {useDueInstallments} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import LoanCollectionsSection from "@/Component/Loan/LoanCollectionsSection.jsx";

function getAmountDue(row) {
    if (!row) return null;

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
        row.due_left,
    ];

    for (const v of directCandidates) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
    }

    const p = Number(row.principal_due ?? row.principal_component ?? row.principal ?? 0);
    const i = Number(row.interest_due ?? row.interest_component ?? row.interest ?? 0);
    const sum = p + i;
    if (Number.isFinite(sum) && sum > 0) return sum;

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
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // due filters
    const [asOnDraft, setAsOnDraft] = useState("");
    const [asOnApplied, setAsOnApplied] = useState("");
    const [loDraft, setLoDraft] = useState("ALL");

    const loQ = useLoanOfficers();
    const dueQ = useDueInstallments(asOnApplied);

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

    const rows = useMemo(() => {
        const d = dueQ.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.results)) return d.results;
        return [];
    }, [dueQ.data]);

    // frontend LO filter
    const filteredRows = useMemo(() => {
        if (loDraft === "ALL") return rows;
        return rows.filter((r) => String(r.lo_id ?? r.loan_officer_id ?? "") === String(loDraft));
    }, [rows, loDraft]);

    const summary = useMemo(() => {
        const total = filteredRows.length;
        const totalDueAmount = filteredRows.reduce((sum, r) => sum + (getAmountDue(r) || 0), 0);
        return {total, totalDueAmount};
    }, [filteredRows]);

    const applyAsOn = () => setAsOnApplied(asOnDraft || "");

    const resetDueFilters = () => {
        setAsOnDraft("");
        setAsOnApplied("");
        setLoDraft("ALL");
    };

    const columns = useMemo(
        () => [
            // ✅ show Loan A/C No (like All Loans) but still use loan_id for summary
            {
                key: "loan_account_no",
                header: "Loan A/C No",
                sortValue: (r) => r.loan_account_no ?? "",
                cell: (r) => <div className="font-medium">{r.loan_account_no ?? "-"}</div>,
            },
            {
                key: "member_name",
                header: "Member",
                sortValue: (r) => r.member_name ?? r.member ?? r.member_full_name ?? "",
                cell: (r) => r.member_name ?? r.member ?? r.member_full_name ?? "-",
            },
            {
                key: "group_name",
                header: "Group",
                sortValue: (r) => r.group_name ?? r.group ?? "",
                cell: (r) => r.group_name ?? r.group ?? "-",
            },
            {
                key: "lo_name",
                header: "Loan Officer",
                sortValue: (r) => {
                    const loIdValue = r.lo_id ?? r.loan_officer_id ?? "";
                    return r.lo_name ?? r.loan_officer_name ?? loNameMap[String(loIdValue)] ?? `LO-${loIdValue}`;
                },
                cell: (r) => {
                    const loIdValue = r.lo_id ?? r.loan_officer_id ?? null;
                    const loName =
                        r.lo_name ??
                        r.loan_officer_name ??
                        (loIdValue != null ? loNameMap[String(loIdValue)] || `LO-${loIdValue}` : "-");
                    return String(loName);
                },
            },
            {
                key: "due_date",
                header: "Due Date",
                sortValue: (r) => r.due_date ?? r.installment_due_date ?? r.date ?? "",
                cell: (r) => String(r.due_date ?? r.installment_due_date ?? r.date ?? "-"),
            },
            {
                key: "installment_no",
                header: "Inst. No",
                sortValue: (r) =>
                    r.installment_no ?? r.installment_number ?? r.emi_no ?? r.week_no ?? r.week_number ?? 0,
                cell: (r, idx) =>
                    String(
                        r.installment_no ??
                        r.installment_number ??
                        r.emi_no ??
                        r.week_no ??
                        r.week_number ??
                        (idx + 1)
                    ),
            },
            {
                key: "amount_due",
                header: "Amount Due",
                sortValue: (r) => getAmountDue(r) ?? 0,
                cell: (r) => {
                    const amountDue = getAmountDue(r);
                    return amountDue == null ? "-" : formatMoney(amountDue);
                },
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                sortValue: () => 0,
                cell: (r) => {
                    // ✅ IMPORTANT: summary needs real loan_id
                    const loanId = r.loan_id ?? r.id ?? null;

                    return (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loanId && onOpenSummary?.(loanId)}
                            disabled={!loanId}
                        >
                            <Eye className="h-4 w-4 mr-2"/>
                            Summary
                        </Button>
                    );
                },
            },
        ],
        [loNameMap, onOpenSummary]
    );

    return (
        <div className="space-y-3">
            {/* Filters (for due) */}
            <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
                        {/* Date + quick buttons */}
                        <div className="xl:col-span-5">
                            <div className="relative">
                                <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    type="date"
                                    value={asOnDraft}
                                    onChange={(e) => setAsOnDraft(e.target.value)}
                                    className="pl-8 w-full"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button variant="outline" size="sm" onClick={() => setAsOnDraft("")}>
                                    All
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setAsOnDraft(today)}>
                                    Today
                                </Button>
                            </div>
                        </div>

                        {/* Loan Officer */}
                        <div className="xl:col-span-4">
                            <Select value={loDraft} onValueChange={setLoDraft}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={loQ.isLoading ? "Loading Loan Officers..." : "Loan Officer"}/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Loan Officers</SelectItem>

                                    {loQ.isLoading ? (
                                        <div className="px-3 py-2">
                                            <Skeleton className="h-4 w-full"/>
                                        </div>
                                    ) : loQ.isError ? (
                                        <div className="px-3 py-2 text-sm text-destructive">Failed to load Loan
                                            Officers</div>
                                    ) : (
                                        loOptions.map((o) => (
                                            <SelectItem key={o.lo_id} value={String(o.lo_id)}>
                                                {o.label}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Actions */}
                        <div className="xl:col-span-3">
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <Button onClick={applyAsOn} className="w-full sm:w-auto">
                                    Apply
                                </Button>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={resetDueFilters}>
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            Total Due: <span className="ml-1 font-semibold">{summary.total}</span>
                        </Badge>
                        <Badge variant="secondary">
                            Total Amount: <span
                            className="ml-1 font-semibold">{formatMoney(summary.totalDueAmount)}</span>
                        </Badge>
                        <Badge variant="outline">
                            As On: <span className="ml-1 font-semibold">{asOnApplied ? asOnApplied : "ALL"}</span>
                        </Badge>
                    </div>
                </div>
            </div>

            {/* ✅ Inner tabs inside Installments Due */}
            <Tabs defaultValue="due" className="w-full">
                <TabsList className="w-full md:w-auto overflow-x-auto">
                    <TabsTrigger value="due">Installments Due</TabsTrigger>
                    <TabsTrigger value="collections">Collections (by LO)</TabsTrigger>
                </TabsList>

                <TabsContent value="due" className="mt-3">
                    <AdvancedTable
                        title="Installments Due"
                        description='View all due installments. Optionally filter by "As On" date.'
                        data={filteredRows}
                        columns={columns}
                        isLoading={dueQ.isLoading}
                        errorText={dueQ.isError ? "Failed to load due installments." : ""}
                        emptyText="No due installments found."
                        enableSearch
                        searchPlaceholder="Search by loan, member, group, LO, date..."
                        // ✅ include loan_account_no in search too
                        searchKeys={["loan_account_no", "loan_id", "member_name", "group_name", "lo_name", "due_date"]}
                        headerRight={
                            <Button variant="outline" onClick={() => dueQ.refetch()}>
                                <RefreshCw className="h-4 w-4 mr-2"/>
                                Refresh
                            </Button>
                        }
                        rowKey={(r) =>
                            `${r.loan_id ?? r.id ?? "x"}-${r.installment_no ?? r.emi_no ?? r.due_date ?? Math.random()}`
                        }
                    />
                </TabsContent>

                <TabsContent value="collections" className="mt-3">
                    <LoanCollectionsSection onOpenSummary={onOpenSummary}/>
                </TabsContent>
            </Tabs>
        </div>
    );
}
