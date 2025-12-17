// src/hooks/useBranches.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";

const BRANCHES_KEY = ["branches"];

export function useBranches(regionId = null) {
    const queryClient = useQueryClient();

    const {
        data: branches = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: regionId ? [...BRANCHES_KEY, {regionId}] : BRANCHES_KEY,
        queryFn: async () => {
            const params = regionId ? {region_id: regionId} : {};
            const res = await api.get("/branches/", {params});
            return res.data; // list[BranchOut]
        },
    });

    const createBranchMutation = useMutation({
        mutationFn: async ({branch_name, region_id}) => {
            const res = await api.post("/branches/", {
                branch_name,
                region_id,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: BRANCHES_KEY});
        },
    });

    const updateBranchMutation = useMutation({
        mutationFn: async ({branch_id, ...payload}) => {
            const res = await api.put(`/branches/${branch_id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: BRANCHES_KEY});
        },
    });

    const deleteBranchMutation = useMutation({
        mutationFn: async (branch_id) => {
            const res = await api.delete(`/branches/${branch_id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: BRANCHES_KEY});
        },
    });

    return {
        branches,
        isLoading,
        isError,
        error,
        refetch,
        createBranchMutation,
        updateBranchMutation,
        deleteBranchMutation,
    };
}
