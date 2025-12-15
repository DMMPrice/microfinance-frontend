import {useMutation} from "@tanstack/react-query";
import {toast} from "sonner";
import {api} from "@/lib/http.js"; // your axios instance
import {storage} from "@/lib/storage.js"; // if you already store auth there

export function useAuthApi() {
    const login = useMutation({
        mutationFn: async ({username, password}) => {
            const res = await api.post("/auth/login", {username, password});
            return res.data;
        },
        onSuccess: (data) => {
            // store whatever your AuthContext expects
            // adjust keys based on your current implementation
            storage.set("accessToken", data.access_token);
            storage.set("user", {
                id: data.user_id,
                name: data.user_name,
                role: data.user_role,
            });
            toast.success("Logged in");
        },
        onError: (err) => {
            toast.error(err?.response?.data?.detail || err?.message || "Login failed");
        },
    });

    const register = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/auth/register", payload);
            return res.data;
        },
        onSuccess: () => toast.success("User created"),
        onError: (err) =>
            toast.error(err?.response?.data?.detail || err?.message || "Create failed"),
    });

    return {login, register};
}
