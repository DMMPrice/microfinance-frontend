// src/pages/loans/LoansAllSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {RefreshCw, Search as SearchIcon, Plus, Eye} from "lucide-react";

import {useLoanMaster} from "@/hooks/useLoans";
import {useLoanOfficers} from "@/hooks/useLoanOfficers";

const TH = "px-3 py-3 text-center align-middle whitespace-nowrap";
const TD = "px-3 py-3 align-middle whitespace-nowrap";
const TD_LEFT = "px-3 py-3 align-middle whitespace-normal";

const STATUS_OPTIONS = ["ALL", "DISBURSED", "ACTIVE", "CLOSED", "CANCELLED"];

export default function LoansAllSection({onCreate, onOpenSummary}) {
    // ----------------------------
    // LO data (from your hook)
    // ----------------------------
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

    // ✅ NEW: build a fast lookup map: lo_id -> full_name
    const loNameMap = useMemo(() => {
        const map = {};
        (loQ.loanOfficers || []).forEach((x) => {
            map[String(x.lo_id)] = x?.employee?.full_name || `LO-${x.lo_id}`;
        });
        return map;
    }, [loQ.loanOfficers]);

    // ----------------------------
    // UI state (draft)
    // ----------------------------
    const [searchDraft, setSearchDraft] = useState("");
    const [statusDraft, setStatusDraft] = useState("ALL");
    const [fromDraft, setFromDraft] = useState(""); // YYYY-MM-DD
    const [toDraft, setToDraft] = useState(""); // YYYY-MM-DD

    // ✅ LO filter (draft + applied)
    const [loDraft, setLoDraft] = useState("ALL");

    const [limit, setLimit] = useState(25);
    const [offset, setOffset] = useState(0);

    // applied filters (query triggers)
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
            lo_id: applied.lo_id || undefined, // ✅ hook will send this to /loans/master
            limit,
            offset,
        }),
        [applied, limit, offset]
    );

    const q = useLoanMaster(filters);

    // ----------------------------
    // Derived values
    // ----------------------------
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

    // ----------------------------
    // Handlers
    // ----------------------------
    const applyFilters = () => {
        setOffset(0);
        setApplied({
            search: searchDraft.trim(),
            status: statusDraft === "ALL" ? "" : statusDraft,
            disburse_from: fromDraft || "",
            disburse_to: toDraft || "",
            lo_id: loDraft === "ALL" ? "" : loDraft, // ✅ string value
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

    return (
        <Card className="rounded-xl">
            <CardHeader className="space-y-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle>All Loans</CardTitle>
                        <CardDescription>
                            Browse all loans with filters (including Loan Officer) and open summary.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => q.refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                        <Button onClick={onCreate}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Create Loan
                        </Button>
                    </div>
                </div>

                {/* Filters row */}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                        <Input
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            placeholder="Search (loan no / member / phone etc.)"
                            className="pl-8"
                        />
                    </div>

                    {/* Status */}
                    <Select value={statusDraft} onValueChange={setStatusDraft}>
                        <SelectTrigger>
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

                    {/* ✅ Loan Officer (from useLoanOfficers + /loan-officers/) */}
                    <Select value={loDraft} onValueChange={setLoDraft}>
                        <SelectTrigger>
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

                    {/* Disburse from */}
                    <Input
                        type="date"
                        value={fromDraft}
                        onChange={(e) => setFromDraft(e.target.value)}
                        placeholder="Disburse from"
                    />

                    {/* Disburse to */}
                    <Input
                        type="date"
                        value={toDraft}
                        onChange={(e) => setToDraft(e.target.value)}
                        placeholder="Disburse to"
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:col-span-2 lg:col-span-6">
                        <Button onClick={applyFilters} className="w-full md:w-auto">
                            Apply
                        </Button>
                        <Button onClick={clearFilters} variant="outline" className="w-full md:w-auto">
                            Clear
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {/* Table */}
                <div className="w-full overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                        <tr>
                            <th className={TH}>Loan ID</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Member</th>
                            <th className={TH}>Group</th>
                            <th className={TH}>Loan Officer</th>
                            <th className={TH}>Disbursed</th>
                            <th className={TH}>Principal</th>
                            <th className={TH}>Action</th>
                        </tr>
                        </thead>

                        <tbody>
                        {q.isLoading ? (
                            Array.from({length: 8}).map((_, i) => (
                                <tr key={i} className="border-t">
                                    {Array.from({length: 8}).map((__, j) => (
                                        <td key={j} className={TD}>
                                            <Skeleton className="h-4 w-24 mx-auto"/>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : rows.length === 0 ? (
                            <tr className="border-t">
                                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                                    No loans found for the selected filters.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => {
                                // Adapt to likely backend keys safely
                                const loanId = r.loan_id ?? r.id ?? r.loan_no ?? "-";
                                const status = r.status ?? "-";
                                const member = r.member_name ?? r.member ?? r.member_full_name ?? "-";
                                const group = r.group_name ?? r.group ?? "-";

                                const disb = r.disburse_date ?? r.disbursed_on ?? r.disbursed_date ?? "-";
                                const principal = r.principal_amount ?? r.principal ?? r.amount ?? "-";

                                // ✅ NEW LOGIC: show Loan Officer full name
                                // Priority:
                                // 1) backend already sent name (lo_name / loan_officer_name)
                                // 2) otherwise map by lo_id from /loan-officers
                                // 3) fallback LO-{id}
                                const loIdValue = r.lo_id ?? r.loan_officer_id ?? r.loId ?? null;

                                const loName =
                                    r.lo_name ??
                                    r.loan_officer_name ??
                                    r.loan_officer ??
                                    (loIdValue != null
                                        ? loNameMap[String(loIdValue)] || `LO-${loIdValue}`
                                        : "-");

                                return (
                                    <tr key={String(loanId)} className="border-t hover:bg-muted/20">
                                        <td className={TD_LEFT}>
                                            <div className="font-medium">{loanId}</div>
                                        </td>
                                        <td className={TD}>
                        <span className="text-xs px-2 py-1 rounded-md border">
                          {String(status)}
                        </span>
                                        </td>
                                        <td className={TD_LEFT}>{member}</td>
                                        <td className={TD_LEFT}>{group}</td>
                                        <td className={TD_LEFT}>{String(loName)}</td>
                                        <td className={TD}>{String(disb)}</td>
                                        <td className={TD}>{String(principal)}</td>
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

                {/* Pagination */}
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
            </CardContent>
        </Card>
    );
}
