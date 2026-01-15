// src/hooks/useApi.js
import axios from "axios";
import {API_URL} from "@/config";

// ✅ Export the instance so other files can import it directly
export const apiClient = axios.create({
    baseURL: API_URL,
    // withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
    const stored = localStorage.getItem("authData");
    if (stored) {
        try {
            const {token, tokenType} = JSON.parse(stored);
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `${(tokenType || "Bearer")} ${token}`;
            }
        } catch (e) {
            console.error("Failed to parse authData from localStorage", e);
        }
    }
    return config;
});

/* =========================
   ✅ Profile helpers (reusable)
========================= */

export function getProfileData() {
    try {
        return JSON.parse(localStorage.getItem("profileData") || "{}");
    } catch {
        return {};
    }
}

export function getUserRole() {
    const p = getProfileData();
    return (p?.role || "").toString().trim();
}

export function getUserBranchId() {
    const p = getProfileData();
    return p?.branch_id ?? null;
}

export function isAdminLikeRole(role) {
    const r = (role || "").toString().trim().toLowerCase();
    return r === "super_admin" || r === "admin";
}

export function useApi() {
    const get = (url, config = {}) => apiClient.get(url, config);
    const post = (url, data, config = {}) => apiClient.post(url, data, config);
    const put = (url, data, config = {}) => apiClient.put(url, data, config);
    const del = (url, config = {}) => apiClient.delete(url, config);

    // ✅ expose profile helpers too (optional but convenient)
    return {
        get,
        post,
        put,
        del,
        client: apiClient,
        getProfileData,
        getUserRole,
        getUserBranchId,
        isAdminLikeRole,
    };
}
