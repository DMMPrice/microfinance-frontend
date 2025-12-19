// src/hooks/useLoans.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

export function useLoanStats() {
    return useQuery({
        queryKey: ["loans", "stats"],
        queryFn: async () => (await apiClient.get("/loans/stats")).data,
    });
}

export function useDueInstallments(as_on) {
    return useQuery({
        queryKey: ["loans", "installmentsDue", as_on],
        enabled: !!as_on,
        queryFn: async () =>
            (await apiClient.get("/loans/installments/due", {params: {as_on}})).data,
    });
}

export function useCollectionsByLO(lo_id, as_on) {
    return useQuery({
        queryKey: ["loans", "collectionsByLO", lo_id, as_on],
        enabled: !!lo_id && !!as_on,
        queryFn: async () =>
            (await apiClient.get(`/loans/collections/by-lo/${lo_id}`, {params: {as_on}})).data,
    });
}

export function useLoansByMember(member_id) {
    return useQuery({
        queryKey: ["loans", "byMember", member_id],
        enabled: !!member_id,
        queryFn: async () => (await apiClient.get(`/loans/by-member/${member_id}`)).data,
    });
}

export function useLoansByGroup(group_id, status) {
    return useQuery({
        queryKey: ["loans", "byGroup", group_id, status || ""],
        enabled: !!group_id,
        queryFn: async () =>
            (await apiClient.get(`/loans/by-group/${group_id}`, {params: status ? {status} : {}})).data,
    });
}

export function useLoanSummary(loan_id) {
    return useQuery({
        queryKey: ["loans", "summary", loan_id],
        enabled: !!loan_id,
        queryFn: async () => (await apiClient.get(`/loans/${loan_id}/summary`)).data,
    });
}

export function useCreateLoan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => (await apiClient.post("/loans", payload)).data,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["loans"]});
        },
    });
}
