// src/hooks/useLoanResolver.js
import {useQuery} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

// same regex you used
function isNumericId(v) {
    return /^\d+$/.test(String(v || "").trim());
}

// normalize like your helpers
function normalizeSearch(search) {
    if (!search) return "";
    return String(search).trim();
}

/**
 * Resolves a loan_id from a loanRef (loan_id OR loan_account_no).
 * - If loanRef is numeric => returns that number immediately
 * - Else => queries /loans/master?search=<loanRef>&limit=50 and finds exact match by loan_account_no
 */
export function useResolveLoanId(loanRef) {
    const ref = String(loanRef || "").trim();

    return useQuery({
        queryKey: ["loan", "resolveLoanId", ref],
        enabled: !!ref && !isNumericId(ref),
        queryFn: async () => {
            const search = normalizeSearch(ref);
            const {data} = await apiClient.get("/loans/master", {
                params: {
                    search,
                    limit: 50,
                    offset: 0,
                },
            });

            // data shape might be:
            // 1) array
            // 2) {rows:[], total:...}
            const rows = Array.isArray(data) ? data : (data?.rows ?? data?.items ?? []);

            // exact match on loan_account_no (case-insensitive)
            const hit = rows.find(
                (x) => String(x?.loan_account_no || "").trim().toLowerCase() === ref.toLowerCase()
            );

            return hit?.loan_id ?? null;
        },
        refetchOnWindowFocus: false,
    });
}
