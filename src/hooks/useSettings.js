import {useCallback, useEffect, useState} from "react";
import {api} from "@/lib/http";

/* -------------------------------------------------
   ✅ Loan Bulk Actions (Pause/Resume) - SUPER ADMIN
   Uses admin-safe routes to avoid conflict with /loans/{loan_id}
-------------------------------------------------- */

function cleanParams(p) {
    const out = {};
    Object.entries(p || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v).trim();
        if (s === "") return;
        out[k] = v;
    });
    return out;
}

// ✅ PATCH /loans/admin/pause?group_id=&branch_id=&remarks=
async function apiBulkPauseLoans(params) {
    const res = await api.patch("/loans/admin/pause", null, {
        params: cleanParams(params),
    });
    return res.data;
}

// ✅ PATCH /loans/admin/resume?group_id=&branch_id=&resume_from=&resequence=&reallocate_payments=&remarks=
async function apiBulkResumeLoans(params) {
    const res = await api.patch("/loans/admin/resume", null, {
        params: cleanParams(params),
    });
    return res.data;
}

/* -------------------------------------------------
   ✅ Settings APIs
-------------------------------------------------- */

// GET /settings
async function apiListSettings() {
    const res = await api.get("/settings");
    return res.data || [];
}

// PATCH /settings  body: { key, value }
async function apiUpdateSetting({key, value}) {
    const res = await api.patch("/settings", {key, value: String(value)});
    return res.data; // { message, key, value }
}

// POST /settings body: { key, value, description }
async function apiCreateSetting({key, value, description}) {
    const res = await api.post("/settings", {
        key: String(key).trim(),
        value: String(value).trim(),
        description: String(description || "").trim(),
    });
    return res.data; // { message:"created", key, value, description }
}

/* -------------------------------------------------
   ✅ Hooks: Settings
-------------------------------------------------- */

export function useSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiListSettings();
            setSettings(data);
            return data;
        } catch (e) {
            setError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const updateLocalValue = useCallback((key, value) => {
        setSettings((prev) =>
            (prev || []).map((r) => (r.key === key ? {...r, value: String(value)} : r))
        );
    }, []);

    const addLocalSetting = useCallback((newSetting) => {
        setSettings((prev) => {
            const exists = (prev || []).some((r) => r.key === newSetting.key);
            if (exists) return prev; // avoid duplicates
            return [newSetting, ...(prev || [])];
        });
    }, []);

    return {settings, loading, error, refetch, updateLocalValue, addLocalSetting};
}

export function useUpdateSetting({onSuccess, onError} = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async ({key, value}) => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiUpdateSetting({key, value});
                onSuccess?.(data);
                return data;
            } catch (e) {
                setError(e);
                onError?.(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    return {mutate, loading, error};
}

export function useCreateSetting({onSuccess, onError} = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async ({key, value, description}) => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiCreateSetting({key, value, description});
                onSuccess?.(data);
                return data;
            } catch (e) {
                setError(e);
                onError?.(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    return {mutate, loading, error};
}

/* -------------------------------------------------
   ✅ Hooks: Bulk Pause/Resume Loans (SUPER ADMIN)
-------------------------------------------------- */

export function useBulkPauseLoans({onSuccess, onError} = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async (params) => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiBulkPauseLoans(params);
                onSuccess?.(data);
                return data;
            } catch (e) {
                setError(e);
                onError?.(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    return {mutate, loading, error};
}

export function useBulkResumeLoans({onSuccess, onError} = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async (params) => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiBulkResumeLoans(params);
                onSuccess?.(data);
                return data;
            } catch (e) {
                setError(e);
                onError?.(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    return {mutate, loading, error};
}