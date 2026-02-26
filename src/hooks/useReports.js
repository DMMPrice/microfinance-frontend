// src/hooks/useReports.js
import {useQuery, useMutation} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

/* ---------------- helpers ---------------- */
function normalizeDate(d) {
    if (!d) return "";
    // accept "YYYY-MM-DD"
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

    // accept Date
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }

    // accept dayjs/moment-like: {format()}
    if (d && typeof d.format === "function") {
        return d.format("YYYY-MM-DD");
    }

    return String(d).slice(0, 10);
}

function buildQS(paramsObj) {
    const p = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        p.set(k, String(v));
    });
    return p.toString();
}

/* =========================================================
   1) Branch Reports Cashbook Passbook
   GET /reports/cashbook/branch/passbook?branch_id=..&from_date=..&to_date=..
========================================================= */
export function useBranchCashbookPassbook({branchId, fromDate, toDate, enabled = false}) {
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: ["reports", "cashbook", "branch", "passbook", branchId, f, t],
        enabled: !!enabled && !!branchId && !!f && !!t,
        queryFn: async () => {
            const qs = buildQS({
                branch_id: branchId,
                from_date: f,
                to_date: t,
            });

            const {data} = await apiClient.get(`/reports/cashbook/branch/passbook?${qs}`);
            return data;
        },
    });
}

// ============================================================
// Branch Reports Cashbook (Loan Ledger + Expenses)
// ============================================================
export function useBranchLoanLedgerLogs({
                                            branchId,
                                            fromDate,
                                            toDate,
                                            includeCharges = true,
                                            includeOtherLogs = true,
                                            includeExpenses = true,
                                            includeEmptyDays = true,
                                            viewMode = "DAILY",
                                            weekStart = "MON",
                                            search,
                                            limit = 200,
                                            offset = 0,
                                            enabled = true,
                                        }) {
    const b = branchId ? String(branchId) : "";
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: [
            "branchLoanLedgerLogs",
            b,
            f,
            t,
            includeCharges,
            includeOtherLogs,
            includeExpenses,
            includeEmptyDays,
            viewMode,
            weekStart,
            search || "",
            limit,
            offset,
        ],
        enabled: enabled && !!b && !!f && !!t,
        queryFn: async () => {
            const qs = buildQS({
                branch_id: b,
                from_date: f,
                to_date: t,
                include_charges: includeCharges ? "true" : "false",
                include_other_logs: includeOtherLogs ? "true" : "false",
                include_expenses: includeExpenses ? "true" : "false",
                include_empty_days: includeEmptyDays ? "true" : "false",
                view_mode: String(viewMode || "DAILY").toUpperCase(),
                week_start: String(weekStart || "MON").toUpperCase(),
                search: search?.trim() ? search.trim() : undefined,
                limit,
                offset,
            });

            const {data} = await apiClient.get(`/reports/cashbook/branch/loan-ledger-logs?${qs}`);
            return data;
        },
    });
}

/* =========================================================
   2) Loan Top Sheet (Branch Reports)
   POST /reports/loan-top-sheet/branch
   payload: { branch_id, month_start, month_end, persist }
========================================================= */
export function useLoanTopSheetBranch({
                                          branchId,
                                          monthStart,
                                          monthEnd,
                                          persist = true,
                                          enabled = false,
                                      }) {
    const b = branchId ? Number(branchId) : null;
    const ms = normalizeDate(monthStart);
    const me = normalizeDate(monthEnd);

    return useQuery({
        queryKey: ["reports", "loanTopSheet", "branch", b, ms, me, !!persist],
        enabled: !!enabled && !!b && !!ms && !!me,
        queryFn: async () => {
            const payload = {
                branch_id: b,
                month_start: ms,
                month_end: me,
                persist: !!persist,
            };

            const { data } = await apiClient.post(`/reports/loan-top-sheet`, payload);
            return data;
        },
    });
}

// ============================================================
// Rebuild balances before running reports (POST /reports/balances/rebuild)
// ============================================================
export function useRebuildBalances() {
    return useMutation({
        mutationKey: ["rebuildBalances"],
        mutationFn: async (payload) => {
            const {data} = await apiClient.post(`/reports/balances/rebuild`, payload);
            return data;
        },
    });
}
