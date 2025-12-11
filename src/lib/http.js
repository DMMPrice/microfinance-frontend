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
// getUserCtx — normalize object for frontend
// ------------------------------------------------------------
export function getUserCtx() {
    try {
        const raw =
            localStorage.getItem("authData") ||
            sessionStorage.getItem("authData");

        if (!raw) return null;

        const parsed = JSON.parse(raw);

        return {
            username: parsed.username,  // (exists)
            role: parsed.role,          // "super_admin"
            accessToken: parsed.token,  // 🔥 FIXED
            userId: parsed.userId,      // also available
            raw: parsed,                // original object
        };
    } catch {
        return null;
    }
}
