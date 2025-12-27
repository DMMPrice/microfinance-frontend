// src/hooks/useGroups.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js"; // axios instance with auth header

const GROUPS_KEY = ["groups"];

function getProfileDataSafe() {
    try {
        return JSON.parse(localStorage.getItem("profileData") || "{}");
    } catch {
        return {};
    }
}

/**
 * 🔹 Main hook – list groups + create/delete/assign
 * ✅ Supports optional filters: lo_id, region_id, branch_id
 * ✅ Auto-applies region/branch for RM/BM from profileData if filters not provided
 */
export function useGroups(filters = {}) {
    const queryClient = useQueryClient();

    const profile = getProfileDataSafe();

    const role = String(profile?.role ?? "").trim(); // e.g. "regional_manager"
    const profileRegionId = profile?.region_id ?? profile?.regionId ?? null;
    const profileBranchId = profile?.branch_id ?? profile?.branchId ?? null;
    const profileUserId = profile?.user_id ?? profile?.userId ?? null;

    const isRM = role === "regional_manager";
    const isBM = role === "branch_manager";
    const isLO = role === "loan_officer";

    // ✅ Caller can pass filters, otherwise auto-filter for RM/BM/LO
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
    };

    // remove null/undefined filters so request params remain clean
    const params = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );

    // GET /groups
    const {
        data: groups = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: Object.keys(params).length
            ? [...GROUPS_KEY, params]
            : GROUPS_KEY,
        queryFn: async () => {
            const res = await api.get("/groups/", {params});
            return res.data; // list[GroupOut]
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    // POST /groups
    const createGroupMutation = useMutation({
        mutationFn: async (payload) => {
            // payload: { group_name, lo_id, region_id, branch_id, meeting_day }
            // ✅ Optional safety: RM/BM cannot create outside their scope
            const finalPayload = {
                ...payload,
                region_id: isRM ? profileRegionId : payload?.region_id,
                branch_id: isBM ? profileBranchId : payload?.branch_id,
                // (LO usually shouldn't create groups; but if allowed, keep lo_id as payload)
            };

            const res = await api.post("/groups", finalPayload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: GROUPS_KEY});
        },
    });

    // DELETE /groups/{group_id}
    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId) => {
            await api.delete(`/groups/${groupId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: GROUPS_KEY});
        },
    });

    // POST /groups/assign-lo  (update LO for multiple groups)
    const assignLoanOfficerMutation = useMutation({
        mutationFn: async ({lo_id, group_ids}) => {
            const res = await api.post("/groups/assign-lo", {
                lo_id,
                group_ids,
            });
            return res.data; // updated groups
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: GROUPS_KEY});
        },
    });

    return {
        groups,
        isLoading,
        isError,
        error,
        refetch,
        createGroupMutation,
        deleteGroupMutation,
        assignLoanOfficerMutation,

        // helpful for UI/debug
        appliedParams: params,
        role,
    };
}

/**
 * 🔹 Get a single group by id
 *    GET /groups/{group_id}
 */
export function useGroup(groupId, {enabled = true} = {}) {
    return useQuery({
        queryKey: [...GROUPS_KEY, groupId],
        enabled: enabled && !!groupId,
        queryFn: async () => {
            const res = await api.get(`/groups/${groupId}/`);
            return res.data; // GroupOut
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}

/**
 * 🔹 Get group summary (group + Members + counts)
 *    GET /groups/{group_id}/summary
 */
export function useGroupSummary(groupId, {enabled = true} = {}) {
    return useQuery({
        queryKey: [...GROUPS_KEY, groupId, "summary"],
        enabled: enabled && !!groupId,
        queryFn: async () => {
            const res = await api.get(`/groups/${groupId}/summary`);
            return res.data; // GroupSummaryOut
        },
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });
}
