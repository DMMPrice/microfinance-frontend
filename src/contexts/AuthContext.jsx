// src/contexts/AuthContext.jsx
import {createContext, useContext, useEffect, useState} from "react";
import {useApi} from "@/hooks/useApi";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const {post} = useApi();

    // `user` will hold token + basic info from backend
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem("authData");
        return stored ? JSON.parse(stored) : null;
    });

    const [isLoading, setIsLoading] = useState(false);

    const isAuthenticated = !!user?.token;

    // Optional: keep state in sync across tabs
    useEffect(() => {
        const handler = () => {
            const stored = localStorage.getItem("authData");
            setUser(stored ? JSON.parse(stored) : null);
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const res = await post("/auth/login", {
                username,     // FastAPI expects `username`
                password,
            });

            const data = res.data;

            const authData = {
                token: data.access_token,
                tokenType: data.token_type,
                role: data.user_role,
                userId: data.user_id,
                username: data.user_name,
            };

            setUser(authData);
            localStorage.setItem("authData", JSON.stringify(authData));

            return true;
        } catch (err) {
            console.error("Login failed:", err?.response?.data || err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("authData");
    };

    return (
        <AuthContext.Provider
            value={{
                user,            // 👈 used by Dashboard
                isAuthenticated, // 👈 used by ProtectedRoute
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }
    return ctx;
}
