// src/hooks/useOpeningBalance.js
import {useMutation, useQuery} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

// Backend routes:
// GET  /reports/opening-balance?entity_type=BRANCH&entity_id=1&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
// POST /reports/opening-balance

export function useOpeningBalances(params = {}) {
    return useQuery({
        queryKey: ["opening-balances", params],
        queryFn: async () => {
            const res = await apiClient.get("/reports/opening-balance", {params});

            // ✅ Normalize: backend may return either Array or {data:Array}
            const payload = res?.data;
            if (Array.isArray(payload)) return payload;
            if (Array.isArray(payload?.data)) return payload.data;
            return [];
        },
        staleTime: 30_000,
    });
}

export function useSetOpeningBalance() {
    return useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.post("/reports/opening-balance", payload);
            return res.data;
        },
    });
}
