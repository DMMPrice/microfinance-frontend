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

export function useMembers() {
    const queryClient = useQueryClient();

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
        queryKey: MEMBERS_KEY,
        queryFn: async () => {
            const res = await api.get("/members", {headers: authHeader()});
            return res.data;
        },
    });

    // -----------------------
    // CREATE MEMBER
    // -----------------------
    const createMemberMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/members", payload, {headers: authHeader()});
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: MEMBERS_KEY});
        },
    });

    // -----------------------
    // ✅ UPDATE MEMBER (FIXED)
    // -----------------------
    const updateMemberMutation = useMutation({
        mutationFn: async ({member_id, payload}) => {
            const res = await api.put(
                `/members/${member_id}`,
                payload,
                {headers: authHeader()}
            );
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
    };
}
