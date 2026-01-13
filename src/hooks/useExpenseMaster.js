// src/hooks/useExpenseMaster.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

/* =========================
   Categories (ExpenseCategory)
   Base: /expenses/master/categories
========================= */

export function useExpenseCategories(params = {}) {
    // params: { is_active?: boolean }
    return useQuery({
        queryKey: ["expenseCategories", params],
        queryFn: async () => {
            const res = await apiClient.get("/expenses/master/categories", {params});
            return res.data;
        },
        staleTime: 60_000,
    });
}

export function useCreateExpenseCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.post("/expenses/master/categories", payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseCategories"]});
        },
    });
}

export function useUpdateExpenseCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({category_id, payload}) => {
            const res = await apiClient.put(`/expenses/master/categories/${category_id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseCategories"]});
        },
    });
}

export function useDeleteExpenseCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (category_id) => {
            const res = await apiClient.delete(`/expenses/master/categories/${category_id}`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseCategories"]});
        },
    });
}

/* =========================
   Subcategories (ExpenseSubCategory)
   Base: /expenses/master/subcategories
========================= */

export function useExpenseSubCategories(params = {}) {
    // params: { category_id?: number, is_active?: boolean }
    return useQuery({
        queryKey: ["expenseSubCategories", params],
        queryFn: async () => {
            const res = await apiClient.get("/expenses/master/subcategories", {params});
            return res.data;
        },
        staleTime: 60_000,
    });
}

export function useCreateExpenseSubCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.post("/expenses/master/subcategories", payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseSubCategories"]});
        },
    });
}

export function useUpdateExpenseSubCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({subcategory_id, payload}) => {
            const res = await apiClient.put(`/expenses/master/subcategories/${subcategory_id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseSubCategories"]});
        },
    });
}

export function useDeleteExpenseSubCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (subcategory_id) => {
            const res = await apiClient.delete(`/expenses/master/subcategories/${subcategory_id}`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ["expenseSubCategories"]});
        },
    });
}
