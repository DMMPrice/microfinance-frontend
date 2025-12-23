// src/hooks/useGroups.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js"; // axios instance with auth header

const GROUPS_KEY = ["groups"];

/**
 * 🔹 Main hook – list groups + create/delete/assign
 */
export function useGroups() {
    const queryClient = useQueryClient();

    // GET /groups
    const {
        data: groups = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: GROUPS_KEY,
        queryFn: async () => {
            const res = await api.get("/groups/");
            return res.data; // list[GroupOut]
        },
    });

    // POST /groups
    const createGroupMutation = useMutation({
        mutationFn: async (payload) => {
            // payload: { group_name, lo_id, region_id, branch_id, meeting_day }
            const res = await api.post("/groups", payload);
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
            // response_model = GroupSummaryOut
            return res.data;
        },
    });
}
