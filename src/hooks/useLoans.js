// src/hooks/useLoans.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient, getProfileData, getUserRole, getUserBranchId} from "@/hooks/useApi.js";

/* -------------------- Helpers -------------------- */
function normalizeId(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
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
  return String(search).trim();
}

/**
 * ✅ Role-based scoping (Frontend safety net)
 * Backend should enforce RBAC, but we also send scope params to avoid
 * accidental cross-branch visibility in list/due screens.
 *
 * - branch_manager -> force branch_id
 * - loan_officer  -> force branch_id + lo_id (if available)
 */
function getScopeParams() {
  try {
    const role = (getUserRole?.() || "").toLowerCase();
    const branchId = getUserBranchId?.();

    // profile can contain lo_id / loan_officer_id depending on backend shape
    const profile = getProfileData?.() || {};
    const loId =
      profile?.lo_id ??
      profile?.loan_officer_id ??
      profile?.loanOfficerId ??
      profile?.loan_officer?.id ??
      profile?.loan_officer?.lo_id;

    const scope = {};

    if (role === "branch_manager") {
      if (branchId) scope.branch_id = Number(branchId);
    } else if (role === "loan_officer") {
      if (branchId) scope.branch_id = Number(branchId);
      if (loId) scope.lo_id = Number(loId);
    }

    return scope;
  } catch {
    return {};
  }
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

/**
 * ✅ Common invalidation for loan screens
 * - refresh KPIs + due lists + master list
 * - refresh summary/schedule/statement for the specific loan (by id OR account)
 */
function invalidateLoanCommon(qc) {
  qc.invalidateQueries({queryKey: ["loans", "stats"]});
  qc.invalidateQueries({queryKey: ["loans", "installmentsDue"]});
  qc.invalidateQueries({queryKey: ["loans", "collectionsByLO"]});
  qc.invalidateQueries({queryKey: ["loans", "collectionsByLOManual"]});
  qc.invalidateQueries({queryKey: ["loans", "master"]});
}

function invalidateLoanDetails(qc, loanRef) {
  const ident = resolveLoanIdentifier(loanRef);
  if (!ident?.value) return;

  qc.invalidateQueries({queryKey: ["loans", "summary", ident.type, ident.value]});
  qc.invalidateQueries({queryKey: ["loans", "schedule", ident.type, ident.value]});
  qc.invalidateQueries({queryKey: ["loans", "statement", ident.type, ident.value]});

  // ✅ If you have both id and account available, invalidate both to be safe
  if (typeof loanRef === "object") {
    const byId = resolveLoanIdentifier({loan_id: loanRef.loan_id});
    const byAcc = resolveLoanIdentifier({loan_account_no: loanRef.loan_account_no});

    if (byId?.value) {
      qc.invalidateQueries({queryKey: ["loans", "summary", byId.type, byId.value]});
      qc.invalidateQueries({queryKey: ["loans", "schedule", byId.type, byId.value]});
      qc.invalidateQueries({queryKey: ["loans", "statement", byId.type, byId.value]});
    }
    if (byAcc?.value) {
      qc.invalidateQueries({queryKey: ["loans", "summary", byAcc.type, byAcc.value]});
      qc.invalidateQueries({queryKey: ["loans", "schedule", byAcc.type, byAcc.value]});
      qc.invalidateQueries({queryKey: ["loans", "statement", byAcc.type, byAcc.value]});
    }
  }
}

/* -------------------- STATS -------------------- */
export function useLoanStats(filters = {}) {
  const params = {
    branch_id: filters?.branch_id ?? undefined,
  };

  const key = JSON.stringify(params);

  return useQuery({
    queryKey: ["loans", "stats", key],
    queryFn: async () => (await apiClient.get("/loans/stats", {params})).data,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/* -------------------- INSTALLMENTS DUE -------------------- */
/**
 * Canonical hook name
 */
export function useInstallmentsDue(as_on, extraFilters = {}) {
  const asOn = normalizeDate(as_on);
  const params = {
    as_on: asOn || undefined,
    // optional filters
    branch_id: extraFilters?.branch_id ?? undefined,
    lo_id: extraFilters?.lo_id ?? undefined,
    group_id: extraFilters?.group_id ?? undefined,
    member_id: extraFilters?.member_id ?? undefined,
    loan_account_no: extraFilters?.loan_account_no
      ? String(extraFilters.loan_account_no).trim()
      : undefined,
  };

  // ✅ enforce role-based scope
  const scope = getScopeParams();
  Object.assign(params, scope);

  const key = JSON.stringify({
    ...params,
    __scope: `${scope?.branch_id || "ALL"}:${scope?.lo_id || "ALL"}`,
  });

  return useQuery({
    queryKey: ["loans", "installmentsDue", key],
    enabled: true,
    queryFn: async () => (await apiClient.get("/loans/installments/due", {params})).data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

/**
 * ✅ Backward-compatible alias
 * Your UI imports useDueInstallments, so export it too.
 */
export function useDueInstallments(as_on, extraFilters = {}) {
  return useInstallmentsDue(as_on, extraFilters);
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

  // ✅ enforce role-based scope (branch_manager / loan_officer)
  const scope = getScopeParams();
  Object.assign(params, scope);

  const key = JSON.stringify({
    ...params,
    __scope: `${scope?.branch_id || "ALL"}:${scope?.lo_id || "ALL"}`,
  });

  return useQuery({
    queryKey: ["loans", "master", key],
    queryFn: async () => (await apiClient.get("/loans/master", {params})).data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

/* -------------------- COLLECTIONS BY LO -------------------- */
export function useCollectionsByLO(lo_id, as_on, loan_account_no) {
  const loId = normalizeId(lo_id);
  const asOn = normalizeDate(as_on);
  const loanAcc = loan_account_no ? String(loan_account_no).trim() : "";

  // ✅ scope safety (branch_manager/loan_officer) in case screen calls ALL
  const scope = getScopeParams();

  return useQuery({
    queryKey: [
      "loans",
      "collectionsByLO",
      loId || "ALL",
      asOn || "ALL",
      loanAcc || "ALL",
      `${scope?.branch_id || "ALL"}:${scope?.lo_id || "ALL"}`,
    ],
    enabled: true,
    queryFn: async () => {
      const params = {...scope};
      if (loId) params.lo_id = Number(loId);
      if (asOn) params.as_on = asOn;
      if (loanAcc) params.loan_account_no = loanAcc;

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
    queryKey: ["loans", "byGroup", groupId, st || "ALL"],
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
      return (
        await apiClient.get(`/loans/by-account/${encodeURIComponent(ident.value)}/summary`)
      ).data;
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
      return (
        await apiClient.get(`/loans/by-account/${encodeURIComponent(ident.value)}/schedule`)
      ).data;
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
      return (
        await apiClient.get(`/loans/by-account/${encodeURIComponent(ident.value)}/statement`)
      ).data;
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
    mutationFn: async ({payload}) => {
      if (!payload || typeof payload !== "object") {
        throw new Error("payload is required");
      }

      const loanId = normalizeId(payload.loan_id);
      if (!loanId) throw new Error("payload.loan_id is required");

      return (
        await apiClient.post(`/loans/collections/pay`, {
          ...payload,
          loan_id: loanId,
        })
      ).data;
    },
    onSuccess: (_data, vars) => {
      invalidateLoanCommon(qc);
      const loan_id = vars?.payload?.loan_id;
      const loan_account_no = vars?.payload?.loan_account_no;
      invalidateLoanDetails(qc, {loan_id, loan_account_no});
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
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });
    },
  });
}

/* -------------------- COLLECTIONS BY LO (MANUAL LOAD) -------------------- */
export function useCollectionsByLOManual(loId, asOn, enabled = false) {
  const lo = normalizeId(loId);
  const d = normalizeDate(asOn);

  // ✅ apply scope
  const scope = getScopeParams();

  return useQuery({
    queryKey: [
      "loans",
      "collectionsByLOManual",
      lo || "ALL",
      d || "ALL",
      `${scope?.branch_id || "ALL"}:${scope?.lo_id || "ALL"}`,
    ],
    enabled: !!enabled,
    queryFn: async () => {
      const params = {...scope};
      if (lo) params.lo_id = Number(lo);
      if (d) params.as_on = d;

      const res = await apiClient.get("/loans/collections/by-lo", {params});

      const payload = res?.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      return rows;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
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
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });
    },
  });
}

/* -------------------- DEACTIVATE LOAN -------------------- */
export function useDeactivateLoan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({loan_id}) => {
      const loanId = normalizeId(loan_id);
      if (!loanId) throw new Error("loan_id is required");
      return (await apiClient.patch(`/loans/${loanId}/deactivate`)).data;
    },
    onSuccess: (_data, vars) => {
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });
    },
  });
}

/* -------------------- PAUSE LOAN -------------------- */
export function usePauseLoan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({loan_id, payload}) => {
      const loanId = normalizeId(loan_id);
      if (!loanId) throw new Error("loan_id is required");
      return (await apiClient.patch(`/loans/${loanId}/pause`, payload || {})).data;
    },
    onSuccess: (_data, vars) => {
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });
    },
  });
}

/* -------------------- RESUME LOAN -------------------- */
export function useResumeLoan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({loan_id, payload}) => {
      const loanId = normalizeId(loan_id);
      if (!loanId) throw new Error("loan_id is required");
      return (await apiClient.patch(`/loans/${loanId}/resume`, payload || {})).data;
    },
    onSuccess: (_data, vars) => {
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });
    },
  });
}

/* -------------------- LOAN CHARGES -------------------- */
export function useLoanCharges(loan_id) {
  const loanId = normalizeId(loan_id);

  return useQuery({
    queryKey: ["loans", "charges", loanId],
    enabled: !!loanId,
    queryFn: async () => (await apiClient.get(`/loans/${loanId}/charges`)).data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

/* -------------------- COLLECT LOAN CHARGE -------------------- */
export function useCollectLoanCharge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({loan_id, charge_id, payload}) => {
      const loanId = normalizeId(loan_id);
      const chargeId = normalizeId(charge_id);
      if (!loanId) throw new Error("loan_id is required");
      if (!chargeId) throw new Error("charge_id is required");
      return (
        await apiClient.post(`/loans/${loanId}/charges/${chargeId}/collect`, payload || {})
      ).data;
    },
    onSuccess: (_data, vars) => {
      invalidateLoanCommon(qc);
      invalidateLoanDetails(qc, {
        loan_id: vars?.loan_id,
        loan_account_no: vars?.loan_account_no,
      });

      // ✅ refresh charges list also
      const loanId = normalizeId(vars?.loan_id);
      if (loanId) qc.invalidateQueries({queryKey: ["loans", "charges", loanId]});
    },
  });
}
