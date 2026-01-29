// src/lib/http.js
import axios from "axios";
import {API_URL} from "@/config.js";

// ------------------------------------------------------------
// AXIOS INSTANCE
// ------------------------------------------------------------
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// ------------------------------------------------------------
// REQUEST INTERCEPTOR — attach token dynamically
// ------------------------------------------------------------
api.interceptors.request.use(
    (config) => {
        try {
            const raw =
                localStorage.getItem("authData") ||
                sessionStorage.getItem("authData");

            if (raw) {
                const parsed = JSON.parse(raw);

                // 🔥 Your actual token key is "token"
                const token = parsed?.token;

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (err) {
            console.warn("Failed to read user token:", err);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ------------------------------------------------------------
// RESPONSE INTERCEPTOR — handle 401
// ------------------------------------------------------------
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn("Unauthorized → clearing session...");

            localStorage.removeItem("authData");
            sessionStorage.removeItem("authData");

            window.location.href = "/#/login";
        }

        return Promise.reject(error);
    }
);

// ------------------------------------------------------------
// getUserCtx — normalized user + profile context
// ------------------------------------------------------------
export function getUserCtx() {
    try {
        const rawAuth =
            localStorage.getItem("authData") ||
            sessionStorage.getItem("authData");

        if (!rawAuth) return null;

        const parsedAuth = JSON.parse(rawAuth);

        // 🔥 NEW: profile data
        const rawProfile = localStorage.getItem("profileData");
        const profileData = rawProfile ? JSON.parse(rawProfile) : null;

        return {
            username: parsedAuth.username,
            role: parsedAuth.role,              // super_admin, branch_manager, etc
            accessToken: parsedAuth.token,
            userId: parsedAuth.userId,

            // ✅ NEW
            profileData,                        // employee profile
            branchId: profileData?.branch_id ?? null,
            regionId: profileData?.region_id ?? null,

            rawAuth: parsedAuth,
        };
    } catch (err) {
        console.warn("Failed to build user context:", err);
        return null;
    }
}

