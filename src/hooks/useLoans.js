// src/hooks/useLoans.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

/* -------------------- Helpers -------------------- */
function normalizeId(v) {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    return s;
}

/**
 * Backend expects `as_on` or date filters as YYYY-MM-DD
 */
function normalizeDate(d) {
    if (!d) return "";
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

    if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return String(d);
}

function normalizeStatus(status) {
    if (!status) return "";
    return String(status).trim().toUpperCase();
}

function normalizeSearch(search) {
    if (!search) return "";
    const s = String(search).trim();
    return s;
}

/* -------------------- STATS -------------------- */
export function useLoanStats() {
    return useQuery({
        queryKey: ["loans", "stats"],
        queryFn: async () => (await apiClient.get("/loans/stats")).data,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- INSTALLMENTS DUE -------------------- */
export function useDueInstallments(as_on) {
    const asOn = normalizeDate(as_on); // should return "" or null when empty

    return useQuery({
        queryKey: ["loans", "installmentsDue", asOn || "ALL"],
        enabled: true, // ✅ always enabled
        queryFn: async () => {
            const params = {};
            if (asOn) params.as_on = asOn; // ✅ only send when present

            const res = await apiClient.get("/loans/installments/due", {params});
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- COLLECTIONS BY LO -------------------- */
export function useCollectionsByLO(lo_id, as_on) {
    const loId = normalizeId(lo_id);     // may be null / ""
    const asOn = normalizeDate(as_on);   // may be null / ""

    return useQuery({
        queryKey: ["loans", "collectionsByLO", loId || "ALL", asOn || "ALL"],

        // ✅ always enabled (backend handles optional params)
        enabled: true,

        queryFn: async () => {
            const params = {};

            // ✅ send only when present
            if (loId) params.lo_id = loId;
            if (asOn) params.as_on = asOn;

            const res = await apiClient.get("/loans/collections/by-lo", {
                params,
            });

            return res.data;
        },

        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOANS BY MEMBER -------------------- */
export function useLoansByMember(member_id) {
    const memberId = normalizeId(member_id);

    return useQuery({
        queryKey: ["loans", "byMember", memberId],
        enabled: !!memberId,
        queryFn: async () => (await apiClient.get(`/loans/by-member/${memberId}`)).data,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOANS BY GROUP -------------------- */
export function useLoansByGroup(group_id, status) {
    const groupId = normalizeId(group_id);
    const st = normalizeStatus(status);

    return useQuery({
        queryKey: ["loans", "byGroup", groupId, st],
        enabled: !!groupId,
        queryFn: async () =>
            (
                await apiClient.get(`/loans/by-group/${groupId}`, {
                    params: st ? {status: st} : {},
                })
            ).data,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN MASTER -------------------- */
/**
 * GET /loans/master
 * Supports filters:
 * status, region_id, branch_id, lo_id, group_id, member_id,
 * disburse_from, disburse_to, search, limit, offset
 */
export function useLoanMaster(filters = {}) {
    const params = {
        status: normalizeStatus(filters.status) || undefined,
        region_id: filters.region_id ?? undefined,
        branch_id: filters.branch_id ?? undefined,
        lo_id: filters.lo_id ?? undefined,
        group_id: filters.group_id ?? undefined,
        member_id: filters.member_id ?? undefined,
        disburse_from: normalizeDate(filters.disburse_from) || undefined,
        disburse_to: normalizeDate(filters.disburse_to) || undefined,
        search: normalizeSearch(filters.search) || undefined,
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
    };

    // Make queryKey stable by serializing params
    const key = JSON.stringify(params);

    return useQuery({
        queryKey: ["loans", "master", key],
        queryFn: async () => (await apiClient.get("/loans/master", {params})).data,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN SUMMARY -------------------- */
export function useLoanSummary(loan_id) {
    const loanId = normalizeId(loan_id);

    return useQuery({
        queryKey: ["loans", "summary", loanId],
        enabled: !!loanId,
        queryFn: async () => (await apiClient.get(`/loans/${loanId}/summary`)).data,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN SCHEDULE -------------------- */
export function useLoanSchedule(loan_id) {
    const loanId = normalizeId(loan_id);

    return useQuery({
        queryKey: ["loans", "schedule", loanId],
        enabled: !!loanId,
        queryFn: async () => (await apiClient.get(`/loans/${loanId}/schedule`)).data,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN STATEMENT -------------------- */
export function useLoanStatement(loan_id) {
    const loanId = normalizeId(loan_id);

    return useQuery({
        queryKey: ["loans", "statement", loanId],
        enabled: !!loanId,
        queryFn: async () => (await apiClient.get(`/loans/${loanId}/statement`)).data,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- CREATE LOAN -------------------- */
export function useCreateLoan() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => (await apiClient.post("/loans", payload)).data,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["loans"]});
        },
    });
}

/* -------------------- CREATE PAYMENT -------------------- */
/**
 * POST /loans/{loan_id}/payments
 * payload must match PaymentCreate schema:
 * {
 *   payment_date?: datetime,
 *   amount_received: number,
 *   payment_mode: "CASH" | ...,
 *   receipt_no?: string,
 *   remarks?: string
 * }
 */
export function useCreateLoanPayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({loan_id, payload}) => {
            const loanId = normalizeId(loan_id);
            if (!loanId) throw new Error("loan_id is required");
            return (await apiClient.post(`/loans/${loanId}/payments`, payload)).data;
        },
        onSuccess: (_data, vars) => {
            const loanId = normalizeId(vars?.loan_id);

            // refresh loan related areas
            qc.invalidateQueries({queryKey: ["loans", "stats"]});
            qc.invalidateQueries({queryKey: ["loans", "installmentsDue"]});
            qc.invalidateQueries({queryKey: ["loans", "collectionsByLO"]});
            qc.invalidateQueries({queryKey: ["loans", "master"]});

            if (loanId) {
                qc.invalidateQueries({queryKey: ["loans", "summary", loanId]});
                qc.invalidateQueries({queryKey: ["loans", "schedule", loanId]});
                qc.invalidateQueries({queryKey: ["loans", "statement", loanId]});
            }
        },
    });
}

/* -------------------- APPLY ADVANCE -------------------- */
/**
 * POST /loans/{loan_id}/apply-advance
 * returns AdvanceApplyResult:
 * { applied_installments, used_advance, remaining_advance }
 */
export function useApplyLoanAdvance() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({loan_id}) => {
            const loanId = normalizeId(loan_id);
            if (!loanId) throw new Error("loan_id is required");
            return (await apiClient.post(`/loans/${loanId}/apply-advance`)).data;
        },
        onSuccess: (_data, vars) => {
            const loanId = normalizeId(vars?.loan_id);

            qc.invalidateQueries({queryKey: ["loans", "stats"]});
            qc.invalidateQueries({queryKey: ["loans", "installmentsDue"]});
            qc.invalidateQueries({queryKey: ["loans", "collectionsByLO"]});
            qc.invalidateQueries({queryKey: ["loans", "master"]});

            if (loanId) {
                qc.invalidateQueries({queryKey: ["loans", "summary", loanId]});
                qc.invalidateQueries({queryKey: ["loans", "schedule", loanId]});
                qc.invalidateQueries({queryKey: ["loans", "statement", loanId]});
            }
        },
    });
}

/* -------------------- COLLECTIONS BY LO (MANUAL LOAD) -------------------- */
/**
 * Same as useCollectionsByLO, but you control `enabled` from UI (button click).
 */
export function useCollectionsByLOManual(lo_id, as_on, enabled = false) {
    const loId = normalizeId(lo_id);
    const asOn = normalizeDate(as_on);

    return useQuery({
        queryKey: ["loans", "collectionsByLO", "manual", loId, asOn],
        enabled: !!enabled && !!loId && !!asOn,
        queryFn: async () =>
            (
                await apiClient.get(`/loans/collections/by-lo/${loId}`, {
                    params: {as_on: asOn},
                })
            ).data,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN PAYMENTS (from STATEMENT) -------------------- */
/**
 * Returns only PAYMENT ledger rows from /loans/{loan_id}/statement
 * API uses txn_date, txn_type, credit, balance_outstanding, narration.
 */
export function useLoanPayments(loan_id, enabled = false) {
    const loanId = normalizeId(loan_id);

    return useQuery({
        queryKey: ["loans", "paymentsOnly", loanId],
        enabled: !!enabled && !!loanId,
        queryFn: async () => (await apiClient.get(`/loans/${loanId}/statement`)).data,
        select: (list) => {
            const rows = Array.isArray(list) ? list : [];
            const onlyPayments = rows.filter((x) => x.txn_type === "PAYMENT");
            onlyPayments.sort((a, b) => (b.ledger_id || 0) - (a.ledger_id || 0));
            return onlyPayments;
        },
        refetchOnWindowFocus: false,
    });
}

