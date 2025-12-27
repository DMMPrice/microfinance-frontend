// src/contexts/AuthContext.jsx
import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {useApi} from "@/hooks/useApi";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const {post, get} = useApi();

    // token + basic login info
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem("authData");
        return stored ? JSON.parse(stored) : null;
    });

    // profile from /auth/me
    const [profile, setProfile] = useState(() => {
        const stored = localStorage.getItem("profileData");
        return stored ? JSON.parse(stored) : null;
    });

    const [isLoading, setIsLoading] = useState(false);

    const isAuthenticated = !!user?.token;

    /* -------------------- Helpers -------------------- */
    const persistAuth = (authData) => {
        setUser(authData);
        if (authData) localStorage.setItem("authData", JSON.stringify(authData));
        else localStorage.removeItem("authData");
    };

    const persistProfile = (profileData) => {
        setProfile(profileData);
        if (profileData) localStorage.setItem("profileData", JSON.stringify(profileData));
        else localStorage.removeItem("profileData");
    };

    const logout = () => {
        persistAuth(null);
        persistProfile(null);
    };

    const fetchProfile = async (token) => {
        const res = await get("/auth/me", {
            headers: {Authorization: `Bearer ${token}`},
        });

        persistProfile(res.data);
        return res.data;
    };

    /* -------------------- Cross-tab sync -------------------- */
    useEffect(() => {
        const handler = () => {
            const authStored = localStorage.getItem("authData");
            const profileStored = localStorage.getItem("profileData");

            setUser(authStored ? JSON.parse(authStored) : null);
            setProfile(profileStored ? JSON.parse(profileStored) : null);
        };

        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    /* -------------------- On app load: refresh profile -------------------- */
    useEffect(() => {
        // if no token, ensure profile cleared
        if (!user?.token) {
            if (profile) persistProfile(null);
            return;
        }

        // always try to sync profile from backend on reload
        // (ensures role, region_id, branch_id are correct)
        (async () => {
            try {
                await fetchProfile(user.token);
            } catch (err) {
                console.error("fetch /auth/me failed:", err?.response?.data || err.message);

                // token expired or invalid → logout
                logout();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.token]);

    /* -------------------- Login -------------------- */
    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const res = await post("/auth/login", {username, password});
            const data = res.data;

            const authData = {
                token: data.access_token,
                tokenType: data.token_type,
                role: data.user_role,
                userId: data.user_id,
                username: data.user_name,
            };

            persistAuth(authData);

            // Immediately load profile details (role/scope/exp)
            await fetchProfile(authData.token);

            return true;
        } catch (err) {
            console.error("Login failed:", err?.response?.data || err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    /* -------------------- Derived role (authoritative) -------------------- */
    const effectiveRole = useMemo(() => {
        // profile.role is source of truth
        return profile?.role || user?.role || "";
    }, [profile?.role, user?.role]);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,         // ✅ this is what you showed in screenshot (profileData)
                role: effectiveRole, // ✅ convenience
                isAuthenticated,
                isLoading,
                login,
                logout,
                refreshProfile: () => (user?.token ? fetchProfile(user.token) : null),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
