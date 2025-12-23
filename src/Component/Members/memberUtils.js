// src/Component/Home/Main Components/Members/memberUtils.js

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

    return {
        groupId: String(group?.id ?? group?.group_id ?? ""),
        officerId,
        branchId: String(branch?.id ?? branch?.branch_id ?? ""),
        regionId: String(region?.id ?? region?.region_id ?? ""),
        group: group?.name || group?.group_name || "Unknown",
        officer: officerName,
        branch: branch?.name || branch?.branch_name || "Unknown",
        region: region?.name || region?.region_name || "Unknown",
    };
}

export function filterMemberRows(rows, filters) {
    const {
        q = "",
        onlyActive = true,
        filterRegionId = "all",
        filterBranchId = "all",
        filterOfficerId = "all",
        filterGroupId = "all",
    } = filters;

    const query = q.trim().toLowerCase();

    return rows.filter(({m, info}) => {
        if (onlyActive && !Boolean(m.is_active ?? true)) return false;

        if (filterRegionId !== "all" && String(info.regionId) !== String(filterRegionId)) return false;
        if (filterBranchId !== "all" && String(info.branchId) !== String(filterBranchId)) return false;
        if (filterOfficerId !== "all" && String(info.officerId) !== String(filterOfficerId)) return false;
        if (filterGroupId !== "all" && String(info.groupId) !== String(filterGroupId)) return false;

        if (!query) return true;

        const hay = [
            m.full_name,
            m.phone,
            m.pincode,
            m.aadhar_no,
            m.pan_no,
            m.voter_id,
            info.group,
            info.officer,
            info.branch,
            info.region,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return hay.includes(query);
    });
}
