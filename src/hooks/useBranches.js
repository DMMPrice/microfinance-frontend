// src/hooks/useBranches.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";

const BRANCHES_KEY = ["branches"];

const normalizeRole = (r) => String(r ?? "").trim().toLowerCase();

function getProfileDataSafe() {
    try {
        return JSON.parse(localStorage.getItem("profileData") || "{}");
    } catch {
        return {};
    }
}

export function useBranches(regionId = null) {
    const queryClient = useQueryClient();

    // ✅ Read logged-in profile info from localStorage.profileData
    const profile = getProfileDataSafe();

    const role = normalizeRole(profile?.role);

    // ✅ Your profileData has region_id (as per screenshot)
    const profileRegionId =
        profile?.region_id ??
        profile?.regionId ??
        null;

    const isRegionalManager = ["regional_manager", "regional manager", "rm"].includes(role);

    /**
     * ✅ Effective region filter rules:
     * 1) If caller passes regionId -> use it (Admin filtering etc.)
     * 2) Else if Regional Manager -> force profileRegionId
     * 3) Else -> no filter (Admin sees all)
     */
    const effectiveRegionId = regionId ?? (isRegionalManager ? profileRegionId : null);

    const {
        data: branches = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: effectiveRegionId
            ? [...BRANCHES_KEY, {regionId: effectiveRegionId}]
            : BRANCHES_KEY,
        enabled: !isRegionalManager || !!profileRegionId, // RM must have region_id to fetch
        queryFn: async () => {
            const params = effectiveRegionId ? {region_id: effectiveRegionId} : {};
            const res = await api.get("/branches/", {params});
            return res.data; // list[BranchOut]
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    const createBranchMutation = useMutation({
        mutationFn: async ({branch_name, region_id}) => {
            // ✅ Safety: If RM creates branch, force their region_id
            const finalRegionId = isRegionalManager ? profileRegionId : region_id;

            const res = await api.post("/branches/", {
                branch_name,
                region_id: finalRegionId,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: BRANCHES_KEY});
        },
    });

    const updateBranchMutation = useMutation({
        mutationFn: async ({branch_id, ...payload}) => {
            // ✅ Optional safety: Prevent RM from changing region_id
            if (isRegionalManager) {
                const {region_id, regionId, ...rest} = payload;
                payload = rest;
            }

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
        effectiveRegionId,
        isRegionalManager,
        profileRegionId,
    };
}
