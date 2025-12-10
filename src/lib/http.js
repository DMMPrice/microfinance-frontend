// src/lib/http.js
import axios from "axios";
import {API_URL} from "@/config.js";

// -------------------------------------------------------------------
// 🔹 BASE URL — change only this if your backend URL changes
// -------------------------------------------------------------------
// -------------------------------------------------------------------
// 🔹 AXIOS INSTANCE
// -------------------------------------------------------------------
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // allows cookies (JWT refresh if needed)
});

// -------------------------------------------------------------------
// 🔹 REQUEST INTERCEPTOR
// Automatically attach token from localStorage
// -------------------------------------------------------------------
api.interceptors.request.use(
    (config) => {
        try {
            const raw = localStorage.getItem("userData");
            if (raw) {
                const parsed = JSON.parse(raw);
                const token = parsed?.access_token;

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

// -------------------------------------------------------------------
// 🔹 RESPONSE INTERCEPTOR
// Handles 401, auto-logout, etc.
// -------------------------------------------------------------------
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn("Unauthorized → clearing session...");
            localStorage.removeItem("userData");
            sessionStorage.removeItem("userData");

            // Optionally redirect to login page
            window.location.href = "/#/login";
        }

        return Promise.reject(error);
    }
);

// -------------------------------------------------------------------
// 🔹 Helper to get normalized user context
// -------------------------------------------------------------------
export function getUserCtx() {
    try {
        const raw = localStorage.getItem("userData") || sessionStorage.getItem("userData");
        if (!raw) return null;

        const parsed = JSON.parse(raw);

        return {
            username: parsed.username,
            role: parsed.role,
            accessToken: parsed.access_token,
            raw: parsed,
        };
    } catch {
        return null;
    }
}
