// src/hooks/useMembers.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http";

const MEMBERS_KEY = ["members"];

function authHeader() {
    const token =
        localStorage.getItem("access_token") ||
        JSON.parse(localStorage.getItem("userData") || "{}")?.access_token;

    return token ? {Authorization: `Bearer ${token}`} : {};
}

function getProfileDataSafe() {
    try {
        return JSON.parse(localStorage.getItem("profileData") || "{}");
    } catch {
        return {};
    }
}

/**
 * ✅ useMembers(filters?)
 * Supports optional filters:
 * - group_id, lo_id, branch_id, region_id
 *
 * Auto-applies:
 * - RM -> region_id from profileData
 * - BM -> branch_id from profileData
 * - LO -> lo_id = profileData.user_id
 */
export function useMembers(filters = {}) {
    const queryClient = useQueryClient();

    const profile = getProfileDataSafe();

    const role = String(profile?.role ?? "").trim(); // "regional_manager"
    const profileRegionId = profile?.region_id ?? profile?.regionId ?? null;
    const profileBranchId = profile?.branch_id ?? profile?.branchId ?? null;
    const profileUserId = profile?.user_id ?? profile?.userId ?? null;

    const isRM = role === "regional_manager";
    const isBM = role === "branch_manager";
    const isLO = role === "loan_officer";

    // ✅ Effective filters (caller wins; else auto-scope for RM/BM/LO)
    const effectiveFilters = {
        region_id:
            filters?.region_id ??
            filters?.regionId ??
            (isRM ? profileRegionId : null),

        branch_id:
            filters?.branch_id ??
            filters?.branchId ??
            (isBM ? profileBranchId : null),

        lo_id:
            filters?.lo_id ??
            filters?.loId ??
            (isLO ? profileUserId : null),

        group_id:
            filters?.group_id ??
            filters?.groupId ??
            null,
    };

    // remove null/undefined/empty filters
    const params = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );

    // -----------------------
    // LIST MEMBERS
    // -----------------------
    const {
        data: members = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: Object.keys(params).length ? [...MEMBERS_KEY, params] : MEMBERS_KEY,
        queryFn: async () => {
            const res = await api.get("/members/", {
                headers: authHeader(),
                params, // ✅ send query params: group_id/lo_id/branch_id/region_id
            });
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    // -----------------------
    // CREATE MEMBER
    // -----------------------
    const createMemberMutation = useMutation({
        mutationFn: async (payload) => {
            // Optional safety: enforce scope for RM/BM/LO on create
            const finalPayload = {
                ...payload,
                region_id: isRM ? profileRegionId : payload?.region_id,
                branch_id: isBM ? profileBranchId : payload?.branch_id,
                lo_id: isLO ? profileUserId : payload?.lo_id,
            };

            const res = await api.post("/members", finalPayload, {
                headers: authHeader(),
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: MEMBERS_KEY});
        },
    });

    // -----------------------
    // UPDATE MEMBER
    // -----------------------
    const updateMemberMutation = useMutation({
        mutationFn: async ({member_id, payload}) => {
            // Optional safety: prevent changing scope fields for RM/BM/LO
            let finalPayload = payload;

            if (isRM || isBM || isLO) {
                const {
                    region_id,
                    regionId,
                    branch_id,
                    branchId,
                    lo_id,
                    loId,
                    ...rest
                } = payload || {};
                finalPayload = rest;
            }

            const res = await api.put(`/members/${member_id}`, finalPayload, {
                headers: authHeader(),
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: MEMBERS_KEY});
        },
    });

    // -----------------------
    // DELETE MEMBER (SOFT)
    // -----------------------
    const deleteMemberMutation = useMutation({
        mutationFn: async (member_id) => {
            const res = await api.delete(`/members/${member_id}`, {
                headers: authHeader(),
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: MEMBERS_KEY});
        },
    });

    // -----------------------
    // RETURN API
    // -----------------------
    return {
        members,
        isLoading,
        isError,
        error,
        refetch,

        createMember: createMemberMutation.mutateAsync,
        isCreating: createMemberMutation.isPending,

        updateMember: updateMemberMutation.mutateAsync,
        isUpdating: updateMemberMutation.isPending,

        deleteMember: deleteMemberMutation.mutateAsync,
        isDeleting: deleteMemberMutation.isPending,

        // helpful debug / UI
        appliedParams: params,
        role,
    };
}
