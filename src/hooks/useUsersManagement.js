import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "@/lib/http.js";

const USERS_KEY = ["users"];

export function useUsersManagement() {
    const qc = useQueryClient();

    const usersQuery = useQuery({
        queryKey: USERS_KEY,
        queryFn: async () => {
            const res = await api.get("/auth/users");
            return res.data; // array
        },
    });

    const createUser = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/auth/register", payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("User created");
            qc.invalidateQueries({queryKey: USERS_KEY});
        },
        onError: (err) =>
            toast.error(err?.response?.data?.detail || err?.message || "Create failed"),
    });

    const updateUser = useMutation({
        mutationFn: async ({user_id, payload}) => {
            const finalPayload = {...payload};
            if (!finalPayload.password) delete finalPayload.password;

            const res = await api.put(`/auth/users/${user_id}`, finalPayload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("User updated");
            qc.invalidateQueries({queryKey: USERS_KEY});
        },
        onError: (err) =>
            toast.error(err?.response?.data?.detail || err?.message || "Update failed"),
    });

    const deleteUser = useMutation({
        mutationFn: async ({user_id}) => {
            const res = await api.delete(`/auth/users/${user_id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success("User deleted");
            qc.invalidateQueries({queryKey: USERS_KEY});
        },
        onError: (err) =>
            toast.error(err?.response?.data?.detail || err?.message || "Delete failed"),
    });

    // ✅ NEW: assign groups to a LO using your router
    const assignGroupsToLO = useMutation({
        mutationFn: async ({lo_id, group_ids}) => {
            const res = await api.post("/groups/assign-lo", {lo_id, group_ids});
            return res.data;
        },
        onSuccess: () => {
            toast.success("Groups assigned");
            qc.invalidateQueries({queryKey: USERS_KEY});
            qc.invalidateQueries({queryKey: ["groups"]});
        },
        onError: (err) =>
            toast.error(err?.response?.data?.detail || err?.message || "Assign failed"),
    });

    return {
        users: usersQuery.data || [],
        isLoading: usersQuery.isLoading,
        isError: usersQuery.isError,
        error: usersQuery.error,
        refetch: usersQuery.refetch,

        createUser,
        updateUser,
        deleteUser,

        // ✅ NEW
        assignGroupsToLO,
    };
}
