// src/pages/loans/LoanCollectionsSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
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

import {RefreshCw, Calendar as CalendarIcon, Eye} from "lucide-react";

import {useCollectionsByLO} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import {DataTable, EmptyHint, ErrBox, SkRows, fmtMoney, todayISO} from "@/Component/Loan/loans.ui.jsx";

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export default function LoanCollectionsSection({onView}) {
    const today = useMemo(() => todayISO(), []);

    // Draft controls (user edits here)
    const [asOnDraft, setAsOnDraft] = useState(today);
    const [loDraft, setLoDraft] = useState("ALL");

    // Applied filters (query uses these)
    const [asOnApplied, setAsOnApplied] = useState(today);
    const [loApplied, setLoApplied] = useState("ALL");

    const loQ = useLoanOfficers();

    // ✅ only pass LO id when user applied specific LO
    const loIdForQuery = loApplied === "ALL" ? "" : loApplied;

    // ✅ date is optional too, but we default to today; pass "" for ALL
    const asOnForQuery = asOnApplied || "";

    const collectionsQ = useCollectionsByLO(loIdForQuery, asOnForQuery);

    const loOptions = useMemo(() => {
        const list = loQ.loanOfficers || [];
        return list.map((x) => ({
            lo_id: x.lo_id,
            label: x?.employee?.full_name ? `${x.employee.full_name} (LO-${x.lo_id})` : `LO-${x.lo_id}`,
        }));
    }, [loQ.loanOfficers]);

    const rows = useMemo(() => {
        const d = collectionsQ.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.results)) return d.results;
        return [];
    }, [collectionsQ.data]);

    const summary = useMemo(() => {
        const total = rows.length;
        const totalDueLeft = rows.reduce((sum, r) => sum + safeNum(r.due_left), 0);
        const totalAdvance = rows.reduce((sum, r) => sum + safeNum(r.advance_balance), 0);
        return {total, totalDueLeft, totalAdvance};
    }, [rows]);

    const applyFilters = () => {
        setAsOnApplied(asOnDraft || "");
        setLoApplied(loDraft || "ALL");
    };

    const resetFilters = () => {
        setAsOnDraft(today);
        setAsOnApplied(today);
        setLoDraft("ALL");
        setLoApplied("ALL");
    };

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>Collections</CardTitle>
                <CardDescription>
                    Due list up to selected date. (Optional: filter by Loan Officer)
                </CardDescription>

                {/* Filters (match LoanDueSection style) */}
                <div className="mt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
                        {/* Date */}
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

                        {/* LO Select */}
                        <div className="xl:col-span-4">
                            <Select value={loDraft} onValueChange={setLoDraft}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={loQ.isLoading ? "Loading Loan Officers..." : "Loan Officer (Optional)"}
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
                        </div>

                        {/* Actions */}
                        <div className="xl:col-span-3">
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <Button onClick={applyFilters} className="w-full sm:w-auto">
                                    Apply
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={resetFilters}
                                >
                                    Reset
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => collectionsQ.refetch()}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2"/>
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            Rows: <span className="ml-1 font-semibold">{summary.total}</span>
                        </Badge>
                        <Badge variant="secondary">
                            Total Due Left:{" "}
                            <span className="ml-1 font-semibold">{fmtMoney(summary.totalDueLeft)}</span>
                        </Badge>
                        <Badge variant="secondary">
                            Total Advance:{" "}
                            <span className="ml-1 font-semibold">{fmtMoney(summary.totalAdvance)}</span>
                        </Badge>
                        <Badge variant="outline">
                            As On:{" "}
                            <span className="ml-1 font-semibold">{asOnApplied ? asOnApplied : "ALL"}</span>
                        </Badge>
                        <Badge variant="outline">
                            LO:{" "}
                            <span
                                className="ml-1 font-semibold">{loApplied === "ALL" ? "ALL" : `LO-${loApplied}`}</span>
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {collectionsQ.isLoading ? (
                    <SkRows/>
                ) : collectionsQ.isError ? (
                    <ErrBox err={collectionsQ.error}/>
                ) : !rows.length ? (
                    <EmptyHint
                        title="No collection rows found."
                        desc="Try changing the date or choose a specific Loan Officer."
                    />
                ) : (
                    <DataTable
                        columns={["Group", "Member", "Due Date", "Due Left", "Advance", "Status", ""]}
                        rows={rows.map((r) => ({
                            key: `${r.loan_id}-${r.installment_no}-${r.member_id}`,
                            cells: [
                                <div key="g">
                                    <div className="font-medium">{r.group_name}</div>
                                    <div className="text-xs text-muted-foreground">#{r.group_id}</div>
                                </div>,
                                <div key="m">
                                    <div className="font-medium">{r.member_name}</div>
                                    <div className="text-xs text-muted-foreground">#{r.member_id}</div>
                                </div>,
                                <div key="d">
                                    <div className="font-medium">{r.due_date}</div>
                                    <div className="text-xs text-muted-foreground">Inst #{r.installment_no}</div>
                                </div>,
                                <div key="dl" className="text-right font-semibold">
                                    {fmtMoney(r.due_left)}
                                </div>,
                                <div key="adv" className="text-right">
                                    {fmtMoney(r.advance_balance)}
                                </div>,
                                <Badge key="s" variant="secondary">
                                    {r.status}
                                </Badge>,
                                <div key="a" className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onView?.(r.loan_id)}>
                                        <Eye className="h-4 w-4 mr-2"/>
                                        View
                                    </Button>
                                </div>,
                            ],
                        }))}
                    />
                )}
            </CardContent>
        </Card>
    );
}
