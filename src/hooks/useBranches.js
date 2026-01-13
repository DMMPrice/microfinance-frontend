// src/hooks/useBranches.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";
import {useMemo} from "react";

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

    const profile = getProfileDataSafe();
    const role = normalizeRole(profile?.role);

    const profileRegionId =
        profile?.region_id ??
        profile?.regionId ??
        null;

    const profileBranchId =
        profile?.branch_id ??
        profile?.branchId ??
        null;

    const isRegionalManager = ["regional_manager", "regional manager", "rm"].includes(role);
    const isBranchManager = ["branch_manager", "branch manager", "bm"].includes(role);

    /**
     * ✅ Effective region filter rules:
     * 1) If caller passes regionId -> use it (admin filters etc.)
     * 2) Else if RM/BM -> force profileRegionId
     * 3) Else -> no filter (admin sees all)
     */
    const effectiveRegionId =
        regionId ?? ((isRegionalManager || isBranchManager) ? profileRegionId : null);

    const {
        data: rawBranches = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: effectiveRegionId
            ? [...BRANCHES_KEY, {regionId: effectiveRegionId}]
            : BRANCHES_KEY,
        enabled:
        // RM/BM must have region_id for safe fetch
            !(isRegionalManager || isBranchManager) || !!profileRegionId,
        queryFn: async () => {
            const params = effectiveRegionId ? {region_id: effectiveRegionId} : {};
            const res = await api.get("/branches/", {params});
            return res.data; // list[BranchOut]
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    // ✅ FINAL branches visible to UI
    const branches = useMemo(() => {
        // Branch Manager => only show their assigned branch
        if (isBranchManager && profileBranchId != null) {
            return (rawBranches || []).filter(
                (b) => (b.branch_id ?? b.id) === profileBranchId
            );
        }
        return rawBranches || [];
    }, [rawBranches, isBranchManager, profileBranchId]);

    // ✅ map for quick lookup
    const branchById = useMemo(() => {
        const map = {};
        for (const b of branches || []) {
            const id = b.branch_id ?? b.id;
            if (id != null) map[id] = b;
        }
        return map;
    }, [branches]);

    const getBranchName = (branchId) => {
        if (branchId == null) return "";
        const b = branchById[branchId];
        return b?.branch_name || b?.name || "";
    };

    // ✅ Optional: prevent Branch Manager from CRUD (safety)
    const canMutate = !isBranchManager;

    const createBranchMutation = useMutation({
        mutationFn: async ({branch_name, region_id}) => {
            if (!canMutate) throw new Error("Not allowed");

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
            if (!canMutate) throw new Error("Not allowed");

            // RM cannot change region
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
            if (!canMutate) throw new Error("Not allowed");
            const res = await api.delete(`/branches/${branch_id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: BRANCHES_KEY});
        },
    });

    return {
        branches,          // ✅ filtered list (BM sees only own)
        rawBranches,       // optional (full list returned by API)
        branchById,
        getBranchName,

        isLoading,
        isError,
        error,
        refetch,

        createBranchMutation,
        updateBranchMutation,
        deleteBranchMutation,

        effectiveRegionId,
        isRegionalManager,
        isBranchManager,
        profileRegionId,
        profileBranchId,
        canMutate,
    };
}
