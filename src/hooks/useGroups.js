// src/hooks/useGroups.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api, getUserCtx} from "@/lib/http.js"; // axios instance + user ctx

const GROUPS_KEY = ["groups"];

const normalizeRole = (r) => String(r ?? "").trim().toLowerCase();

/**
 * useGroups(filters)
 * ✅ Admin/Super Admin: no auto filter (can pass any filters)
 * ✅ Regional Manager: auto region_id (unless explicitly passed)
 * ✅ Branch Manager: auto branch_id (unless explicitly passed)
 * ✅ Loan Officer: auto user_id (employee_id) (unless explicitly passed)
 *
 * Supported query params:
 * - region_id
 * - branch_id
 * - lo_id
 * - user_id   (employee_id -> mapped in backend to LO -> groups)
 */
export function useGroups(filters = {}) {
    const queryClient = useQueryClient();

    // ✅ Use centralized ctx builder (authData + profileData)
    const ctx = getUserCtx();
    const profile = ctx?.profileData ?? {};

    const role = normalizeRole(ctx?.role ?? profile?.role);

    const profileRegionId = ctx?.regionId ?? profile?.region_id ?? profile?.regionId ?? null;
    const profileBranchId = ctx?.branchId ?? profile?.branch_id ?? profile?.branchId ?? null;

    // employee_id (backend maps user_id -> loan_officers.employee_id)
    const profileUserId = profile?.user_id ?? profile?.userId ?? ctx?.userId ?? null;

    const isRM = ["regional_manager", "regional manager", "rm"].includes(role);
    const isBM = ["branch_manager", "branch manager", "bm"].includes(role);
    const isLO = ["loan_officer", "loan officer", "lo"].includes(role);

    // caller filters (accept both snake_case and camelCase)
    const fRegion = filters?.region_id ?? filters?.regionId ?? null;
    const fBranch = filters?.branch_id ?? filters?.branchId ?? null;
    const fLoId = filters?.lo_id ?? filters?.loId ?? null;
    const fUserId = filters?.user_id ?? filters?.userId ?? null;

    const effectiveFilters = {
        region_id: fRegion ?? (isRM ? profileRegionId : null),
        branch_id: fBranch ?? (isBM ? profileBranchId : null),
        lo_id: fLoId ?? null,
        user_id: fUserId ?? (isLO ? profileUserId : null),
    };

    const params = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );

    const {
        data: groups = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: Object.keys(params).length ? [...GROUPS_KEY, params] : GROUPS_KEY,
        queryFn: async () => {
            const res = await api.get("/groups/", {params});
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    // POST /groups
    const createGroupMutation = useMutation({
        mutationFn: async (payload) => {
            const finalPayload = {
                ...payload,
                region_id: isRM ? profileRegionId : payload?.region_id,
                branch_id: isBM ? profileBranchId : payload?.branch_id,
            };
            const res = await api.post("/groups", finalPayload);
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: GROUPS_KEY}),
    });

    // ✅ PUT /groups/{group_id}
    const updateGroupMutation = useMutation({
        mutationFn: async ({group_id, payload}) => {
            const res = await api.put(`/groups/${group_id}`, payload);
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: GROUPS_KEY}),
    });

    // DELETE /groups/{group_id}
    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId) => {
            await api.delete(`/groups/${groupId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: GROUPS_KEY}),
    });

    // POST /groups/assign-lo
    const assignLoanOfficerMutation = useMutation({
        mutationFn: async ({lo_id, group_ids}) => {
            const res = await api.post("/groups/assign-lo", {lo_id, group_ids});
            return res.data;
        },
        onSuccess: () => queryClient.invalidateQueries({queryKey: GROUPS_KEY}),
    });

    return {
        groups,
        isLoading,
        isError,
        error,
        refetch,

        createGroupMutation,
        updateGroupMutation,
        deleteGroupMutation,
        assignLoanOfficerMutation,

        appliedParams: params,
        role,
    };
}

export function useGroup(groupId, {enabled = true} = {}) {
    return useQuery({
        queryKey: [...GROUPS_KEY, groupId],
        enabled: enabled && !!groupId,
        queryFn: async () => {
            const res = await api.get(`/groups/${groupId}`);
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

export function useGroupSummary(groupId, {enabled = true} = {}) {
    return useQuery({
        queryKey: [...GROUPS_KEY, groupId, "summary"],
        enabled: enabled && !!groupId,
        queryFn: async () => {
            const res = await api.get(`/groups/${groupId}/summary`);
            return res.data;
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}
