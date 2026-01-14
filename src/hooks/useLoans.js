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

function isNumericId(v) {
    return /^\d+$/.test(String(v || "").trim());
}

function resolveLoanIdentifier(input) {
    // input can be:
    // - { loan_id: 123 } OR { loan_account_no: "LN-0001" }
    // - "123" OR "LN-0001"
    if (!input) return null;

    if (typeof input === "object") {
        if (input.loan_id != null && String(input.loan_id).trim() !== "") {
            return {type: "id", value: Number(input.loan_id)};
        }
        if (input.loan_account_no) {
            return {type: "acc", value: String(input.loan_account_no).trim()};
        }
        return null;
    }

    const ref = String(input).trim();
    if (!ref) return null;
    if (isNumericId(ref)) return {type: "id", value: Number(ref)};
    return {type: "acc", value: ref};
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
    const asOn = normalizeDate(as_on);

    return useQuery({
        queryKey: ["loans", "installmentsDue", asOn || "ALL"],
        enabled: true,
        queryFn: async () => {
            const params = {};
            if (asOn) params.as_on = asOn;

            const res = await apiClient.get("/loans/installments/due", {params});
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- COLLECTIONS BY LO -------------------- */
export function useCollectionsByLO(lo_id, as_on) {
    const loId = normalizeId(lo_id);
    const asOn = normalizeDate(as_on);

    return useQuery({
        queryKey: ["loans", "collectionsByLO", loId || "ALL", asOn || "ALL"],
        enabled: true,

        queryFn: async () => {
            const params = {};

            if (loId) params.lo_id = Number(loId);
            if (asOn) params.as_on = asOn;

            const {data} = await apiClient.get("/loans/collections/by-lo", {params});
            return data;
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

    const key = JSON.stringify(params);

    return useQuery({
        queryKey: ["loans", "master", key],
        queryFn: async () => (await apiClient.get("/loans/master", {params})).data,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN SUMMARY -------------------- */
export function useLoanSummary(loanRef) {
    const ident = resolveLoanIdentifier(loanRef);

    return useQuery({
        queryKey: ["loans", "summary", ident?.type, ident?.value],
        enabled: !!ident?.value,
        queryFn: async () => {
            if (ident.type === "id") {
                return (await apiClient.get(`/loans/${ident.value}/summary`)).data;
            }
            // ✅ backend endpoint (recommended)
            return (await apiClient.get(`/loans/${encodeURIComponent(ident.value)}/summary`)).data;
        },
        refetchOnWindowFocus: false,
    });
}


/* -------------------- LOAN SCHEDULE -------------------- */
export function useLoanSchedule(loanRef) {
    const ident = resolveLoanIdentifier(loanRef);

    return useQuery({
        queryKey: ["loans", "schedule", ident?.type, ident?.value],
        enabled: !!ident?.value,
        queryFn: async () => {
            if (ident.type === "id") {
                return (await apiClient.get(`/loans/${ident.value}/schedule`)).data;
            }
            return (await apiClient.get(`/loans/${encodeURIComponent(ident.value)}/schedule`)).data;
        },
        refetchOnWindowFocus: false,
    });
}

/* -------------------- LOAN STATEMENT -------------------- */
export function useLoanStatement(loanRef) {
    const ident = resolveLoanIdentifier(loanRef);

    return useQuery({
        queryKey: ["loans", "statement", ident?.type, ident?.value],
        enabled: !!ident?.value,
        queryFn: async () => {
            if (ident.type === "id") {
                return (await apiClient.get(`/loans/${ident.value}/statement`)).data;
            }
            return (await apiClient.get(`/loans/${encodeURIComponent(ident.value)}/statement`)).data;
        },
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

/* -------------------- COLLECTIONS BY LO (DEFAULT LOAD) -------------------- */
/**
 * Initial load: GET /loans/collections/by-lo (NO params)
 * After selecting LO/date: GET /loans/collections/by-lo?lo_id=..&as_on=..
 */
export function useCollectionsByLOManual(loId, asOn, enabled = false) {
    return useQuery({
        queryKey: ["collectionsByLOManual", loId, asOn],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (loId) params.set("lo_id", loId);
            if (asOn) params.set("as_on", asOn);

            const res = await apiClient.get(`/loans/collections/by-lo?${params.toString()}`);

            // ✅ normalize API response to array
            const payload = res?.data;
            const rows =
                Array.isArray(payload) ? payload :
                    Array.isArray(payload?.rows) ? payload.rows :
                        Array.isArray(payload?.data) ? payload.data :
                            [];

            return rows;
        },
        enabled: !!enabled && !!loId && !!asOn,
    });
}

/* -------------------- LOAN PAYMENTS (from STATEMENT) -------------------- */
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

/* -------------------- UPDATE LOAN (PUT /loans/{loan_id}) -------------------- */
export function useUpdateLoan() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({loan_id, payload}) => {
            const loanId = normalizeId(loan_id);
            if (!loanId) throw new Error("loan_id is required");
            if (!payload || typeof payload !== "object") throw new Error("payload is required");
            return (await apiClient.put(`/loans/${loanId}`, payload)).data;
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

/* -------------------- CANCEL LOAN (DELETE /loans/{loan_id}) -------------------- */
/** Option A: soft delete/cancel -> sets status CANCELLED in backend */
export function useDeactivateLoan() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({loan_id}) => {
            const loanId = normalizeId(loan_id);
            if (!loanId) throw new Error("loan_id is required");
            return (await apiClient.patch(`/loans/${loanId}/deactivate`)).data;
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
