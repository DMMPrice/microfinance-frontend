// src/hooks/useLoanOfficers.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";

const LOAN_OFFICERS_KEY = ["loan-officers"];
const LOAN_OFFICER_SUMMARY_KEY = (loId) => [
    "loan-officers",
    "group-summary",
    loId ?? "all",
];

/**
 * Basic Loan Officer CRUD + list hook
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
            const res = await api.get("/loan-officers");
            // expects List[LoanOfficerOut]
            return res.data;
        },
    });

    // 🔹 POST /loan-officers
    // payload should match LoanOfficerCreate → { employee_id: string }
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
    };
}

/**
 * Optional helper for:
 *  - GET /loan-officers/groups/summary
 *  - GET /loan-officers/groups/summary?lo_id={lo_id}
 *
 * Usage:
 *   const {data, isLoading} = useLoanOfficerGroupSummary();        // all LOs in scope
 *   const {data, isLoading} = useLoanOfficerGroupSummary(loId);    // single LO summary
 */
export function useLoanOfficerGroupSummary(loId = null, options = {}) {
    const {enabled = true} = options;

    return useQuery({
        queryKey: LOAN_OFFICER_SUMMARY_KEY(loId),
        enabled,
        queryFn: async () => {
            const res = await api.get("/loan-officers/groups/summary", {
                params: loId != null ? {lo_id: loId} : {},
            });
            // expects List[LoanOfficerGroupSummaryOut]
            return res.data;
        },
    });
}
