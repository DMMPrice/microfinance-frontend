// src/hooks/useLoanOfficers.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";

const LOAN_OFFICERS_KEY = ["loan-officers"];
const LOAN_OFFICER_SUMMARY_KEY = (loId) => ["loan-officers", "group-summary", loId ?? "all"];

// ✅ NEW: single LO details hook (must be top-level export)
export function useLoanOfficerById(loId, options = {}) {
    const enabled = options.enabled ?? true;

    return useQuery({
        queryKey: ["loan-officer", loId],
        enabled: enabled && loId != null && loId !== "" && !Number.isNaN(Number(loId)),
        queryFn: async () => {
            const res = await api.get(`/loan-officers/${loId}`);
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

/**
 * Loan Officer CRUD + list hook
 * Uses:
 *  - GET    /loan-officers
 *  - POST   /loan-officers
 *  - DELETE /loan-officers/{lo_id}
 */
export function useLoanOfficers() {
    const queryClient = useQueryClient();

    // 🔹 GET /loan-officers
    const {
        data: loanOfficers = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: LOAN_OFFICERS_KEY,
        queryFn: async () => {
            const res = await api.get("/loan-officers/");
            return res.data;
        },
        refetchOnWindowFocus: false,
    });

    // 🔹 POST /loan-officers
    const createLoanOfficerMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/loan-officers", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: LOAN_OFFICERS_KEY});
        },
    });

    // 🔹 DELETE /loan-officers/{lo_id}
    const deleteLoanOfficerMutation = useMutation({
        mutationFn: async (loId) => {
            await api.delete(`/loan-officers/${loId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: LOAN_OFFICERS_KEY});
        },
    });

    return {
        loanOfficers,
        isLoading,
        isError,
        error,
        refetch,
        createLoanOfficerMutation,
        deleteLoanOfficerMutation,
        isCreating: createLoanOfficerMutation.isPending,
        isDeleting: deleteLoanOfficerMutation.isPending,
    };
}

/**
 * Optional helper for group summary
 */
export function useLoanOfficerGroupSummary(loId = null, options = {}) {
    const {enabled = true} = options;

    return useQuery({
        queryKey: LOAN_OFFICER_SUMMARY_KEY(loId),
        enabled,
        queryFn: async () => {
            const res = await api.get("/loan-officers/groups/summary/", {
                params: loId != null ? {lo_id: loId} : {},
            });
            return res.data;
        },
        refetchOnWindowFocus: false,
    });
}
