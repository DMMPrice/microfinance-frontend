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

import {RefreshCw, Search as SearchIcon, Eye} from "lucide-react";

import {useLoanMaster} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";

const STATUS_OPTIONS = ["ALL", "DISBURSED", "ACTIVE", "CLOSED", "CANCELLED"];

function formatMoney(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function LoansAllSection({onOpenSummary}) {
    // LO
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

    // Draft UI state
    const [searchDraft, setSearchDraft] = useState("");
    const [statusDraft, setStatusDraft] = useState("ALL");
    const [fromDraft, setFromDraft] = useState("");
    const [toDraft, setToDraft] = useState("");
    const [loDraft, setLoDraft] = useState("ALL");

    // Backend pagination
    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);

    // Applied filters (trigger query)
    const [applied, setApplied] = useState({
        search: "",
        status: "",
        disburse_from: "",
        disburse_to: "",
        lo_id: "",
    });

    const filters = useMemo(
        () => ({
            search: applied.search || undefined,
            status: applied.status || undefined,
            disburse_from: applied.disburse_from || undefined,
            disburse_to: applied.disburse_to || undefined,
            lo_id: applied.lo_id || undefined,
            limit,
            offset,
        }),
        [applied, limit, offset]
    );

    const q = useLoanMaster(filters);

    const rows = useMemo(() => {
        const d = q.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.results)) return d.results;
        return [];
    }, [q.data]);

    const total = useMemo(() => {
        const d = q.data;
        if (!d) return null;
        if (typeof d.total === "number") return d.total;
        if (typeof d.count === "number") return d.count;
        return null;
    }, [q.data]);

    const page = Math.floor(offset / limit) + 1;
    const canPrev = offset > 0;
    const canNext = total !== null ? offset + limit < total : rows.length === limit;

    const applyFilters = () => {
        setOffset(0);
        setApplied({
            search: searchDraft.trim(),
            status: statusDraft === "ALL" ? "" : statusDraft,
            disburse_from: fromDraft || "",
            disburse_to: toDraft || "",
            lo_id: loDraft === "ALL" ? "" : loDraft,
        });
    };

    const clearFilters = () => {
        setSearchDraft("");
        setStatusDraft("ALL");
        setFromDraft("");
        setToDraft("");
        setLoDraft("ALL");
        setOffset(0);
        setApplied({
            search: "",
            status: "",
            disburse_from: "",
            disburse_to: "",
            lo_id: "",
        });
    };

    // Table columns (AdvancedTable)
    const columns = useMemo(
        () => [
            {
                key: "loan_id",
                header: "Loan ID",
                sortValue: (r) => r.loan_id ?? r.id ?? r.loan_no ?? "",
                cell: (r) => <div className="font-medium">{r.loan_id ?? r.id ?? r.loan_no ?? "-"}</div>,
            },
            {
                key: "status",
                header: "Status",
                sortValue: (r) => r.status ?? "",
                cell: (r) => (
                    <span className="text-xs px-2 py-1 rounded-md border">
            {String(r.status ?? "-")}
          </span>
                ),
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
                    const loIdValue = r.lo_id ?? r.loan_officer_id ?? r.loId ?? "";
                    return r.lo_name ?? r.loan_officer_name ?? loNameMap[String(loIdValue)] ?? `LO-${loIdValue}`;
                },
                cell: (r) => {
                    const loIdValue = r.lo_id ?? r.loan_officer_id ?? r.loId ?? null;
                    const loName =
                        r.lo_name ??
                        r.loan_officer_name ??
                        r.loan_officer ??
                        (loIdValue != null ? loNameMap[String(loIdValue)] || `LO-${loIdValue}` : "-");
                    return String(loName);
                },
            },
            {
                key: "disburse_date",
                header: "Disbursed",
                sortValue: (r) => r.disburse_date ?? r.disbursed_on ?? r.disbursed_date ?? "",
                cell: (r) => String(r.disburse_date ?? r.disbursed_on ?? r.disbursed_date ?? "-"),
            },
            {
                key: "principal",
                header: "Principal",
                sortValue: (r) => Number(r.principal_amount ?? r.principal ?? r.amount ?? 0),
                cell: (r) => formatMoney(r.principal_amount ?? r.principal ?? r.amount ?? "-"),
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                sortValue: () => 0,
                cell: (r) => {
                    const loanId = r.loan_id ?? r.id ?? r.loan_no ?? "-";
                    return (
                        <Button variant="outline" size="sm" onClick={() => onOpenSummary?.(loanId)}>
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
            {/* ✅ Fixed / compact filter area like the one you approved */}
            <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-col gap-3">
                    {/* Controls */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
                        {/* Search */}
                        <div className="xl:col-span-4">
                            <div className="relative">
                                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    placeholder="Search (loan no / member / phone etc.)"
                                    className="pl-8 w-full"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="xl:col-span-2">
                            <Select value={statusDraft} onValueChange={setStatusDraft}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Loan Officer */}
                        <div className="xl:col-span-3">
                            <Select value={loDraft} onValueChange={setLoDraft}>
                                <SelectTrigger className="w-full">
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
                        </div>

                        {/* Date range */}
                        <div className="xl:col-span-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input
                                    type="date"
                                    value={fromDraft}
                                    onChange={(e) => setFromDraft(e.target.value)}
                                    className="w-full"
                                />
                                <Input
                                    type="date"
                                    value={toDraft}
                                    onChange={(e) => setToDraft(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions (wrap safely) */}
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button onClick={applyFilters}>Apply</Button>
                        <Button variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                        <Button variant="outline" onClick={() => q.refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                    </div>

                    {/* Badges row (already wraps, keep it) */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                            Page: <span className="ml-1 font-semibold">{page}</span>
                        </Badge>
                        <Badge variant="secondary">
                            Limit: <span className="ml-1 font-semibold">{limit}</span>
                        </Badge>
                        <Badge variant="outline">
                            Total:{" "}
                            <span className="ml-1 font-semibold">{total !== null ? total : rows.length}</span>
                        </Badge>

                        <Badge variant="outline">
                            Status: <span className="ml-1 font-semibold">{applied.status || "ALL"}</span>
                        </Badge>
                        <Badge variant="outline">
                            LO: <span className="ml-1 font-semibold">{applied.lo_id || "ALL"}</span>
                        </Badge>
                        <Badge variant="outline">
                            Range:{" "}
                            <span className="ml-1 font-semibold">
          {applied.disburse_from || "—"} → {applied.disburse_to || "—"}
        </span>
                        </Badge>
                    </div>
                </div>
            </div>


            {/* ✅ AdvancedTable */}
            <div className="w-full overflow-x-auto">
                <AdvancedTable
                    title="All Loans"
                    description="Browse all loans with filters (including Loan Officer) and open summary."
                    data={rows}
                    columns={columns}
                    isLoading={q.isLoading}
                    errorText={q.isError ? "No loans loaded (API error)." : ""}
                    emptyText="No loans found for the selected filters."
                    enableSearch={false} // ✅ because search is in filter bar already (backend search)
                    enablePagination={false} // ✅ we use backend prev/next
                    enableColumnToggle
                    stickyHeader
                    rowKey={(r) => String(r.loan_id ?? r.id ?? r.loan_no ?? Math.random())}
                />
            </div>

            {/* ✅ Backend Pagination controls (kept exactly like before) */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{page}</span>
                    {total !== null ? (
                        <>
                            {" "}
                            · Total <span className="font-medium text-foreground">{total}</span>
                        </>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        value={String(limit)}
                        onValueChange={(v) => {
                            const next = Number(v);
                            setLimit(next);
                            setOffset(0);
                        }}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Rows"/>
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 25, 50, 100].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                    {n} rows
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        disabled={!canPrev}
                        onClick={() => setOffset((x) => Math.max(0, x - limit))}
                    >
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!canNext}
                        onClick={() => setOffset((x) => x + limit)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
