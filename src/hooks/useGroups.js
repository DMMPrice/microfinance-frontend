// src/hooks/useGroups.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js"; // your axios instance

const GROUPS_KEY = ["groups"];

export function useGroups() {
    const queryClient = useQueryClient();

    // 🔹 GET /groups
    const {
        data: groups = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: GROUPS_KEY,
        queryFn: async () => {
            const res = await api.get("/groups");
            // expects list[GroupOut]
            return res.data;
        },
    });

    // 🔹 POST /groups
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

    // 🔹 DELETE /groups/{group_id}
    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId) => {
            await api.delete(`/groups/${groupId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: GROUPS_KEY});
        },
    });

    // (optional) 🔹 POST /groups/assign-lo
    const assignLoanOfficerMutation = useMutation({
        mutationFn: async ({lo_id, group_ids}) => {
            const res = await api.post("/groups/assign-lo", {
                lo_id,
                group_ids,
            });
            return res.data;
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
