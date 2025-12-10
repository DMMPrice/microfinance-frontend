// src/hooks/useApi.js
import axios from "axios";
import {API_URL} from "@/config";

// Create a single axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    // withCredentials: true, // enable if you use cookies later
});

// Automatically attach Authorization header if token exists
apiClient.interceptors.request.use((config) => {
    const stored = localStorage.getItem("authData");
    if (stored) {
        try {
            const {token, tokenType} = JSON.parse(stored);
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `${tokenType || "bearer"} ${token}`;
            }
        } catch (e) {
            console.error("Failed to parse authData from localStorage", e);
        }
    }
    return config;
});

export function useApi() {
    const get = (url, config = {}) => apiClient.get(url, config);
    const post = (url, data, config = {}) => apiClient.post(url, data, config);
    const put = (url, data, config = {}) => apiClient.put(url, data, config);
    const del = (url, config = {}) => apiClient.delete(url, config);

    return {get, post, put, del, client: apiClient};
}
