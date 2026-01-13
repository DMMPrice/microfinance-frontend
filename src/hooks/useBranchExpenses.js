// src/hooks/useBranchExpenses.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

export function useBranchExpenses(params = {}) {
    // params: { branch_id?, category_id?, subcategory_id?, from_date?, to_date? }
    return useQuery({
        queryKey: ["branchExpenses", params],
        queryFn: async () => {
            const res = await apiClient.get("/branch-expenses/", {params});
            return res.data;
        },
        staleTime: 30_000,
    });
}

export function useCreateBranchExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.post("/branch-expenses/", payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["branchExpenses"]});
        },
    });
}

export function useUpdateBranchExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({expense_id, payload}) => {
            const res = await apiClient.put(`/branch-expenses/${expense_id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["branchExpenses"]});
        },
    });
}

export function useDeleteBranchExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (expense_id) => {
            const res = await apiClient.delete(`/branch-expenses/${expense_id}`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["branchExpenses"]});
        },
    });
}
