// src/Component/Loan/LoanDueSection.jsx
// NOTE: No logic changes needed here. Your import expects useDueInstallments.
// This file is included only so you can drop it in without hunting.
import React, {useEffect, useMemo, useState} from "react";
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

import {useDueInstallments} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {getUserCtx} from "@/lib/http.js";

/* ---------------- helpers ---------------- */
function todayLocalISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function isOverdueDate(dueDateLike) {
    if (!dueDateLike) return false;

    let d = new Date(dueDateLike);

    if (Number.isNaN(d.getTime())) {
        const s = String(dueDateLike).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const yyyy = Number(m[1]);
            const mm = Number(m[2]);
            const dd = Number(m[3]);
            d = new Date(yyyy, mm - 1, dd);
        }
    }

    if (Number.isNaN(d.getTime())) return false;

    const dueStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return dueStart < todayStart;
}

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
    return n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function numOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function readProfileData() {
    try {
        const raw = localStorage.getItem("profileData");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/* ---------------- component ---------------- */

export default function LoanDueSection({onOpenSummary}) {
    const today = useMemo(() => todayLocalISODate(), []);

    const userCtx = useMemo(() => getUserCtx(), []);
    const profileData = useMemo(() => readProfileData(), []);

    const role = String(profileData?.role ?? userCtx?.role ?? "").trim();

    const ctxBranchId = useMemo(() => {
        const p = profileData || {};
        const rawAuth = userCtx?.raw || {};
        return (
            numOrNull(p.branch_id) ??
            numOrNull(p.branchId) ??
            numOrNull(rawAuth.branch_id) ??
            numOrNull(rawAuth.branchId) ??
            null
        );
    }, [profileData, userCtx]);

    const ctxRegionId = useMemo(() => {
        const p = profileData || {};
        const rawAuth = userCtx?.raw || {};
        return (
            numOrNull(p.region_id) ??
            numOrNull(p.regionId) ??
            numOrNull(rawAuth.region_id) ??
            numOrNull(rawAuth.regionId) ??
            null
        );
    }, [profileData, userCtx]);

    const useMasterLOList = useMemo(
        () => ["admin", "regional_manager", "branch_manager", "super_admin"].includes(role),
        [role]
    );

    const [asOnDraft, setAsOnDraft] = useState("");
    const [asOnApplied, setAsOnApplied] = useState("");
    const [loDraft, setLoDraft] = useState("ALL");

    useEffect(() => {
        const t = todayLocalISODate();
        setAsOnDraft(t);
        setAsOnApplied(t);
    }, []);

    const loQ = useLoanOfficers();
    const dueQ = useDueInstallments(asOnApplied);

    const loNameMap = useMemo(() => {
        const map = {};
        (loQ.loanOfficers || []).forEach((x) => {
            map[String(x.lo_id)] = x?.employee?.full_name || `LO-${x.lo_id}`;
        });
        return map;
    }, [loQ.loanOfficers]);

    const rows = useMemo(() => {
        const d = dueQ.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.items)) return d.items;
        if (Array.isArray(d?.results)) return d.results;
        return [];
    }, [dueQ.data]);

    const loOptions = useMemo(() => {
        if (useMasterLOList) {
            const list = (loQ.loanOfficers || []).filter((x) => {
                const emp = x?.employee || {};
                const loBranchId = numOrNull(emp.branch_id);
                const loRegionId = numOrNull(emp.region_id);

                if (role === "super_admin" || role === "admin") return true;

                if (role === "regional_manager") {
                    if (ctxRegionId == null) return true;
                    return loRegionId === ctxRegionId;
                }

                if (role === "branch_manager") {
                    if (ctxBranchId == null) return true;
                    return loBranchId === ctxBranchId;
                }

                return true;
            });

            return list
                .map((x) => {
                    const emp = x?.employee || {};
                    const name = emp?.full_name || `LO-${x.lo_id}`;
                    const branchId = emp?.branch_id ?? "";
                    return {
                        lo_id: String(x.lo_id),
                        label: name,
                        _branchSort: numOrNull(branchId) ?? 999999,
                    };
                })
                .sort((a, b) => {
                    if (a._branchSort !== b._branchSort) return a._branchSort - b._branchSort;
                    return String(a.label).localeCompare(String(b.label));
                })
                .map(({_branchSort, ...rest}) => rest);
        }

        const ids = new Set(
            (rows || [])
                .map((r) => r.lo_id ?? r.loan_officer_id)
                .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
                .map((v) => String(v))
        );

        return Array.from(ids)
            .map((id) => ({
                lo_id: id,
                label: loNameMap[id] ?? `LO-${id}`,
            }))
            .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }, [useMasterLOList, loQ.loanOfficers, rows, loNameMap, role, ctxBranchId, ctxRegionId]);

    useEffect(() => {
        if (loDraft === "ALL") return;
        const exists = loOptions.some((o) => String(o.lo_id) === String(loDraft));
        if (!exists) setLoDraft("ALL");
    }, [loDraft, loOptions]);

    const filteredRows = useMemo(() => {
        if (loDraft === "ALL") return rows;
        return rows.filter(
            (r) => String(r.lo_id ?? r.loan_officer_id ?? "") === String(loDraft)
        );
    }, [rows, loDraft]);

    const summary = useMemo(() => {
        return {
            total: filteredRows.length,
            totalDueAmount: filteredRows.reduce((sum, r) => sum + (getAmountDue(r) || 0), 0),
        };
    }, [filteredRows]);

    const applyAsOn = () => setAsOnApplied(asOnDraft || "");
    const resetDueFilters = () => {
        const t = todayLocalISODate();
        setAsOnDraft(t);
        setAsOnApplied(t);
        setLoDraft("ALL");
    };

    const columns = useMemo(
        () => [
            {
                key: "loan_account_no",
                header: "Loan A/C No",
                cell: (r) => {
                    const due = r.due_date ?? r.installment_due_date;
                    const overdue = isOverdueDate(due);

                    return (
                        <div className="flex items-center justify-center gap-2 font-medium">
                            {overdue && (
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                                </span>
                            )}
                            <span className={overdue ? "text-red-600 font-semibold" : ""}>
                                {r.loan_account_no ?? "-"}
                            </span>
                        </div>
                    );
                },
            },
            { key: "member_name", header: "Member", cell: (r) => r.member_name ?? r.member ?? "-" },
            { key: "group_name", header: "Group", cell: (r) => r.group_name ?? r.group ?? "-" },
            {
                key: "lo_name",
                header: "Loan Officer",
                cell: (r) => {
                    const loId = r.lo_id ?? r.loan_officer_id;
                    return r.lo_name ?? r.loan_officer_name ?? loNameMap[String(loId)] ?? "-";
                },
            },
            { key: "due_date", header: "Due Date", cell: (r) => r.due_date ?? r.installment_due_date ?? "-" },
            {
                key: "installment_no",
                header: "Inst. No",
                cell: (r, idx) => r.installment_no ?? r.installment_number ?? r.emi_no ?? idx + 1,
            },
            {
                key: "amount_due",
                header: "Amount Due",
                cell: (r) => {
                    const v = getAmountDue(r);
                    return v == null ? "-" : formatMoney(v);
                },
            },
            {
                key: "action",
                header: "Action",
                hideable: false,
                cell: (r) => {
                    const loanId = r.loan_id ?? r.id;
                    return (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!loanId}
                            onClick={() => loanId && onOpenSummary?.(loanId)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
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
            <div className="rounded-xl border bg-card p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-5">
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">As On Date</div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative flex-1">
                                    <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={asOnDraft}
                                        onChange={(e) => setAsOnDraft(e.target.value)}
                                        className="pl-8 h-10"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-10" onClick={() => setAsOnDraft("")}>
                                        All
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-10" onClick={() => setAsOnDraft(today)}>
                                        Today
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">Loan Officer</div>

                            <Select value={loDraft} onValueChange={setLoDraft}>
                                <SelectTrigger className="h-10">
                                    <SelectValue
                                        placeholder={(useMasterLOList ? loQ.isLoading : dueQ.isLoading) ? "Loading..." : "Select Loan Officer"}
                                    />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="ALL">All Loan Officers</SelectItem>

                                    {(useMasterLOList ? loQ.isLoading : dueQ.isLoading) ? (
                                        <div className="px-3 py-2">
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    ) : loOptions.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">No Loan Officers found</div>
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
                    </div>

                    <div className="lg:col-span-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button className="h-10 w-full sm:w-auto" onClick={applyAsOn}>
                                Apply
                            </Button>
                            <Button variant="outline" className="h-10 w-full sm:w-auto" onClick={resetDueFilters}>
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                        Total Due: <span className="ml-1 font-semibold">{summary.total}</span>
                    </Badge>
                    <Badge variant="secondary">
                        Total Amount: <span className="ml-1 font-semibold">{formatMoney(summary.totalDueAmount)}</span>
                    </Badge>
                    <Badge variant="outline">
                        As On: <span className="ml-1 font-semibold">{asOnApplied || "ALL"}</span>
                    </Badge>
                </div>
            </div>

            <AdvancedTable
                title="Installments Due"
                data={filteredRows}
                columns={columns}
                isLoading={dueQ.isLoading}
                emptyText="No due installments found."
                enableSearch
                searchPlaceholder="Search loan, member, group, LO..."
                pageSizeOptions={[5, 10, 20, 50, 100]}
                headerRight={
                    <Button variant="outline" onClick={() => dueQ.refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                }
            />
        </div>
    );
}
