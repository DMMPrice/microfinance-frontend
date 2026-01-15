// src/hooks/useBranchExpenses.js
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiClient, getProfileData, isAdminLikeRole} from "@/hooks/useApi.js";

/* =========================
   In-memory caches
========================= */
const branchNameCache = new Map();       // branch_id -> branch_name
const categoryNameCache = new Map();     // category_id -> category_name
const subcategoryNameCache = new Map();  // subcategory_id -> subcategory_name

async function getBranchName(branch_id) {
    if (!branch_id) return "";
    if (branchNameCache.has(branch_id)) return branchNameCache.get(branch_id);

    const res = await apiClient.get(`/branches/${branch_id}`);
    const name = res?.data?.branch_name ?? "";
    branchNameCache.set(branch_id, name);
    return name;
}

async function getCategoryName(category_id) {
    if (!category_id) return "";
    if (categoryNameCache.has(category_id)) return categoryNameCache.get(category_id);

    const res = await apiClient.get(`/expenses/master/categories/${category_id}`);
    const name = res?.data?.category_name ?? "";
    categoryNameCache.set(category_id, name);
    return name;
}

async function getSubCategoryName(subcategory_id) {
    if (!subcategory_id) return "";
    if (subcategoryNameCache.has(subcategory_id)) return subcategoryNameCache.get(subcategory_id);

    const res = await apiClient.get(`/expenses/master/subcategories/${subcategory_id}`);
    const name = res?.data?.subcategory_name ?? "";
    subcategoryNameCache.set(subcategory_id, name);
    return name;
}

export function useBranchExpenses(params = {}) {
    return useQuery({
        queryKey: ["branchExpenses", params],
        queryFn: async () => {
            const profile = getProfileData();
            const role = profile?.role;
            const userBranchId = profile?.branch_id;

            // ✅ Rule: non-admin-like roles must be scoped to their branch
            const effectiveParams = isAdminLikeRole(role)
                ? params
                : {
                    ...params,
                    branch_id: userBranchId ?? params.branch_id,
                };

            const res = await apiClient.get("/branch-expenses/", {params: effectiveParams});
            const rows = Array.isArray(res.data) ? res.data : [];

            // collect unique ids
            const branchIds = [...new Set(rows.map(r => r.branch_id).filter(Boolean))];
            const categoryIds = [...new Set(rows.map(r => r.category_id).filter(Boolean))];
            const subcategoryIds = [...new Set(rows.map(r => r.subcategory_id).filter(Boolean))];

            // fetch missing names in parallel
            await Promise.all([
                ...branchIds
                    .filter(id => !branchNameCache.has(id))
                    .map(id => getBranchName(id).catch(() => "")),

                ...categoryIds
                    .filter(id => !categoryNameCache.has(id))
                    .map(id => getCategoryName(id).catch(() => "")),

                ...subcategoryIds
                    .filter(id => !subcategoryNameCache.has(id))
                    .map(id => getSubCategoryName(id).catch(() => "")),
            ]);

            // enrich rows
            return rows.map(r => ({
                ...r,
                branch_name: branchNameCache.get(r.branch_id) || "",
                category_name: categoryNameCache.get(r.category_id) || "",
                subcategory_name: r.subcategory_id
                    ? (subcategoryNameCache.get(r.subcategory_id) || "")
                    : "",
            }));
        },
        staleTime: 30_000,
    });
}

/* =========================
   Mutations (unchanged)
========================= */

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
