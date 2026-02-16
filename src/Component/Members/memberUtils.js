// src/Component/Home/Main Components/Members/memberUtils.js

function safeLower(v) {
    return (v == null ? "" : String(v)).toLowerCase();
}

function safeStr(v) {
    return v == null ? "" : String(v);
}

function getOfficerIdFromRow(row) {
    const m = row?.m || {};
    const info = row?.info || {};

    // prefer computed info if present
    const fromInfo =
        info?.officerId ??
        info?.loanOfficerId ??
        info?.lo_id ??
        info?.loan_officer_id;

    // fallback from member/group relation if present in member payload
    const fromMember =
        m?.loan_officer_id ??
        m?.lo_id ??
        m?.officer_id;

    const v = fromInfo ?? fromMember;
    return v == null ? "" : String(v);
}

function getGroupIdFromRow(row) {
    const m = row?.m || {};
    const info = row?.info || {};
    const v = info?.groupId ?? info?.group_id ?? m?.group_id;
    return v == null ? "" : String(v);
}

function getBranchIdFromRow(row) {
    const info = row?.info || {};
    const v = info?.branchId ?? info?.branch_id;
    return v == null ? "" : String(v);
}

function getRegionIdFromRow(row) {
    const info = row?.info || {};
    const v = info?.regionId ?? info?.region_id;
    return v == null ? "" : String(v);
}

export function buildMaps({groups = [], branches = [], regions = [], officers = []}) {
    const groupById = new Map();
    groups.forEach((g) => groupById.set(String(g.id ?? g.group_id), g));

    const branchById = new Map();
    branches.forEach((b) => branchById.set(String(b.id ?? b.branch_id), b));

    const regionById = new Map();
    regions.forEach((r) => regionById.set(String(r.id ?? r.region_id), r));

    const officerNameById = new Map();
    officers.forEach((o) => officerNameById.set(String(o.id ?? o.user_id ?? o.lo_id), o.name));

    return {groupById, branchById, regionById, officerNameById};
}

export function getMemberInfo(member, maps) {
    const {groupById, branchById, regionById, officerNameById} = maps;

    const group = groupById.get(String(member.group_id));
    const officerId = String(group?.loanOfficerId ?? group?.lo_id ?? "");
    const officerName = officerNameById.get(officerId) || "Unknown";

    const branch = branchById.get(String(group?.branchId ?? group?.branch_id)) || null;
    const region =
        (branch && regionById.get(String(branch?.regionId ?? branch?.region_id))) || null;

    // Meeting day (best-effort; supports multiple backend shapes)
    const meetingRaw =
        group?.meeting_day ??
        group?.meetingDay ??
        group?.meeting_day_name ??
        group?.meetingDayName ??
        group?.meeting ??
        null;

    const meetingDay = normalizeMeetingDay(meetingRaw);

    return {
        groupId: String(group?.id ?? group?.group_id ?? ""),
        officerId,
        branchId: String(branch?.id ?? branch?.branch_id ?? ""),
        regionId: String(region?.id ?? region?.region_id ?? ""),
        group: group?.name || group?.group_name || "Unknown",
        meetingDay,
        officer: officerName,
        branch: branch?.name || branch?.branch_name || "Unknown",
        region: region?.name || region?.region_name || "Unknown",
    };
}

function normalizeMeetingDay(v) {
    if (v == null) return "";

    // If backend sends { name: "Monday" }
    if (typeof v === "object") {
        const maybe = v?.name ?? v?.day ?? v?.label ?? "";
        return normalizeMeetingDay(maybe);
    }

    // If backend sends numeric day index
    if (typeof v === "number") {
        const map0 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        if (v >= 0 && v <= 6) return map0[v];
        if (v >= 1 && v <= 7) return map0[(v % 7)];
        return String(v);
    }

    const s = String(v).trim();
    if (!s) return "";

    // Normalize common abbreviations
    const low = s.toLowerCase();
    const map = {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        tues: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        thur: "Thursday",
        thurs: "Thursday",
        fri: "Friday",
        sat: "Saturday",
    };
    if (map[low]) return map[low];

    // Title case for anything else
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function filterMemberRows(rows = [], filters = {}) {
    const {
        q = "",
        onlyActive = false,
        filterRegionId = "all",
        filterBranchId = "all",
        filterOfficerId = "all",
        filterGroupId = "all",
    } = filters || {};

    const ql = safeLower(q).trim();

    return (rows || []).filter((row) => {
        const m = row?.m || {};
        const info = row?.info || {};

        // ✅ Active filter
        if (onlyActive) {
            const active = Boolean(m?.is_active ?? true);
            if (!active) return false;
        }

        // ✅ Region filter
        if (filterRegionId !== "all") {
            if (getRegionIdFromRow(row) !== String(filterRegionId)) return false;
        }

        // ✅ Branch filter
        if (filterBranchId !== "all") {
            if (getBranchIdFromRow(row) !== String(filterBranchId)) return false;
        }

        // ✅ Officer filter (THIS IS THE FIX)
        if (filterOfficerId !== "all") {
            if (getOfficerIdFromRow(row) !== String(filterOfficerId)) return false;
        }

        // ✅ Group filter
        if (filterGroupId !== "all") {
            if (getGroupIdFromRow(row) !== String(filterGroupId)) return false;
        }

        // ✅ Search (name/phone/group/officer/branch/region/meeting day)
        if (ql) {
            const hay = [
                m?.full_name,
                m?.phone,
                m?.dob,
                info?.group,
                info?.officer,
                info?.branch,
                info?.region,
                info?.meetingDay,
            ]
                .map(safeStr)
                .join(" ")
                .toLowerCase();

            if (!hay.includes(ql)) return false;
        }

        return true;
    });
}
