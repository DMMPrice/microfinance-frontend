// src/hooks/useReports.js
import {useQuery} from "@tanstack/react-query";
import {apiClient} from "@/hooks/useApi.js";

/* ---------------- helpers ---------------- */
function normalizeDate(d) {
    if (!d) return "";
    // accept "YYYY-MM-DD"
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

    // accept Date
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }

    // accept dayjs/moment-like: {format()}
    if (d && typeof d.format === "function") {
        return d.format("YYYY-MM-DD");
    }

    return String(d).slice(0, 10);
}

function buildQS(paramsObj) {
    const p = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        p.set(k, String(v));
    });
    return p.toString();
}

/* =========================================================
   1) Branch Cashbook Passbook
   GET /reports/cashbook/branch/passbook?branch_id=..&from_date=..&to_date=..
========================================================= */
export function useBranchCashbookPassbook({branchId, fromDate, toDate, enabled = false}) {
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: ["reports", "cashbook", "branch", "passbook", branchId, f, t],
        enabled: !!enabled && !!branchId && !!f && !!t,
        queryFn: async () => {
            const qs = buildQS({
                branch_id: branchId,
                from_date: f,
                to_date: t,
            });

            const {data} = await apiClient.get(`/reports/cashbook/branch/passbook?${qs}`);
            return data;
        },
    });
}

/* =========================================================
   2) Group Cashbook Passbook
   GET /reports/cashbook/group/passbook?group_id=..&from_date=..&to_date=..&include_charges=true
========================================================= */
export function useGroupCashbookPassbook({
                                             groupId,
                                             fromDate,
                                             toDate,
                                             includeCharges = true,
                                             enabled = false,
                                         }) {
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: [
            "reports",
            "cashbook",
            "group",
            "passbook",
            groupId,
            f,
            t,
            !!includeCharges,
        ],
        enabled: !!enabled && !!groupId && !!f && !!t,
        queryFn: async () => {
            const qs = buildQS({
                group_id: groupId,
                from_date: f,
                to_date: t,
                include_charges: includeCharges ? "true" : "false",
            });

            const {data} = await apiClient.get(`/reports/cashbook/group/passbook?${qs}`);
            return data;
        },
    });
}

/* =========================================================
   3) Admin: Regions + Branches (nested)
   GET /reports/admin/regions-branches
========================================================= */
export function useAdminRegionsBranches({enabled = true} = {}) {
    return useQuery({
        queryKey: ["reports", "admin", "regions-branches"],
        enabled: !!enabled,
        keepPreviousData: true,
        queryFn: async () => {
            const {data} = await apiClient.get(`/reports/admin/regions-branches`);
            return data;
        },
    });
}

/* =========================================================
   4) Admin: Regions + Branches + Stats
   GET /reports/admin/regions-branches/stats
========================================================= */
export function useAdminRegionsBranchesStats({enabled = true} = {}) {
    return useQuery({
        queryKey: ["reports", "admin", "regions-branches", "stats"],
        enabled: !!enabled,
        keepPreviousData: true,
        queryFn: async () => {
            const {data} = await apiClient.get(`/reports/admin/regions-branches/stats`);
            return data;
        },
    });
}

/* =========================================================
   5) Admin: Transaction Log (audit)
   GET /reports/admin/txns?from_date=..&to_date=..&region_id=&branch_id=&group_id=&source=&limit=&offset=
========================================================= */
export function useAdminTransactionLog({
                                           fromDate,
                                           toDate,
                                           regionId,
                                           branchId,
                                           groupId,
                                           source, // EXPENSE / INSTALLMENT / DISBURSEMENT / CHARGE
                                           limit = 200,
                                           offset = 0,
                                           enabled = false,
                                       }) {
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: [
            "reports",
            "admin",
            "txns",
            f,
            t,
            regionId || null,
            branchId || null,
            groupId || null,
            source ? String(source).toUpperCase() : null,
            limit,
            offset,
        ],
        enabled: !!enabled && !!f && !!t,
        keepPreviousData: true,
        queryFn: async () => {
            const qs = buildQS({
                from_date: f,
                to_date: t,
                region_id: regionId,
                branch_id: branchId,
                group_id: groupId,
                source: source ? String(source).toUpperCase() : undefined,
                limit,
                offset,
            });

            const {data} = await apiClient.get(`/reports/admin/txns?${qs}`);
            return data;
        },
    });
}

/* =========================================================
   6) Admin: Passbook (running balance across scope)
   GET /reports/admin/passbook?from_date=..&to_date=..&region_id=&branch_id=&group_id=&include_charges=true
========================================================= */
export function useAdminPassbook({
                                     fromDate,
                                     toDate,
                                     regionId,
                                     branchId,
                                     groupId,
                                     includeCharges = true,
                                     enabled = false,
                                 }) {
    const f = normalizeDate(fromDate);
    const t = normalizeDate(toDate);

    return useQuery({
        queryKey: [
            "reports",
            "admin",
            "passbook",
            f,
            t,
            regionId || null,
            branchId || null,
            groupId || null,
            includeCharges ? "true" : "false",
        ],
        enabled: !!enabled && !!f && !!t,
        keepPreviousData: true,
        queryFn: async () => {
            const qs = buildQS({
                from_date: f,
                to_date: t,
                region_id: regionId,
                branch_id: branchId,
                group_id: groupId,
                include_charges: includeCharges ? "true" : "false",
            });

            const {data} = await apiClient.get(`/reports/admin/passbook?${qs}`);
            return data;
        },
    });
}
