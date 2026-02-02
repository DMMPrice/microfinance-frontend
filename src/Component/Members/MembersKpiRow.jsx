// src/Component/Members/MembersKpiRow.jsx
import React, {useMemo} from "react";
import StatCard from "@/Utils/StatCard.jsx";
import {Users, UserCheck, UserX, Building2, MapPinned, Briefcase, CalendarDays} from "lucide-react";

/**
 * KPI row for Members page.
 * - Uses rows already filtered/scoped by the page (recommended to pass filteredRows).
 * - Adapts KPI labels/cards by role.
 */
export default function MembersKpiRow({role = "", rows = [], groups = []}) {
    const stats = useMemo(() => {
        const list = Array.isArray(rows) ? rows : [];

        const total = list.length;
        const active = list.filter(({m}) => Boolean(m?.is_active ?? true)).length;
        const inactive = Math.max(0, total - active);

        const groupIds = new Set();
        const branchIds = new Set();
        const regionIds = new Set();
        const officerIds = new Set();

        list.forEach(({info}) => {
            if (!info) return;
            if (info.groupId) groupIds.add(String(info.groupId));
            if (info.branchId) branchIds.add(String(info.branchId));
            if (info.regionId) regionIds.add(String(info.regionId));
            if (info.officerId) officerIds.add(String(info.officerId));
        });

        // Today's meetings (based on meeting_day of groups within visible rows)
        const groupById = new Map();
        (groups || []).forEach((g) => groupById.set(String(g.id ?? g.group_id), g));

        const today = new Date().toLocaleDateString("en-US", {weekday: "long"}).toLowerCase();

        let todayMeetings = 0;
        groupIds.forEach((gid) => {
            const g = groupById.get(String(gid));
            const md = String(g?.meeting_day ?? g?.meetingDay ?? "").toLowerCase();
            if (md && md === today) todayMeetings += 1;
        });

        return {
            total,
            active,
            inactive,
            groups: groupIds.size,
            branches: branchIds.size,
            regions: regionIds.size,
            officers: officerIds.size,
            todayMeetings,
        };
    }, [rows, groups]);

    const r = String(role || "").toLowerCase();

    const isLoanOfficer = r === "loan_officer";
    const isBranchManager = r === "branch_manager";
    const isRegionalManager = r === "regional_manager";
    const isAdminLike = r === "admin" || r === "super_admin" || r === "superadmin";

    // Decide which 4 cards to show (consistent layout)
    const cards = useMemo(() => {
        if (isLoanOfficer) {
            return [
                {title: "My Members", value: stats.total, Icon: Users, variant: "blue"},
                {title: "Active", value: stats.active, Icon: UserCheck, variant: "green"},
                {title: "Inactive", value: stats.inactive, Icon: UserX, variant: "red"},
                {title: "Today's Meetings", value: stats.todayMeetings, Icon: CalendarDays, variant: "amber"},
            ];
        }

        if (isBranchManager) {
            return [
                {title: "Members", value: stats.total, Icon: Users, variant: "blue"},
                {title: "Active", value: stats.active, Icon: UserCheck, variant: "green"},
                {title: "Groups", value: stats.groups, Icon: Briefcase, variant: "purple"},
                {title: "Loan Officers", value: stats.officers, Icon: Building2, variant: "amber"},
            ];
        }

        if (isRegionalManager) {
            return [
                {title: "Members", value: stats.total, Icon: Users, variant: "blue"},
                {title: "Active", value: stats.active, Icon: UserCheck, variant: "green"},
                {title: "Branches", value: stats.branches, Icon: Building2, variant: "amber"},
                {title: "Groups", value: stats.groups, Icon: Briefcase, variant: "purple"},
            ];
        }

        if (isAdminLike) {
            return [
                {title: "Members", value: stats.total, Icon: Users, variant: "blue"},
                {title: "Active", value: stats.active, Icon: UserCheck, variant: "green"},
                {title: "Regions", value: stats.regions, Icon: MapPinned, variant: "purple"},
                {title: "Branches", value: stats.branches, Icon: Building2, variant: "amber"},
            ];
        }

        // Default fallback
        return [
            {title: "Members", value: stats.total, Icon: Users, variant: "blue"},
            {title: "Active", value: stats.active, Icon: UserCheck, variant: "green"},
            {title: "Inactive", value: stats.inactive, Icon: UserX, variant: "red"},
            {title: "Groups", value: stats.groups, Icon: Briefcase, variant: "purple"},
        ];
    }, [isLoanOfficer, isBranchManager, isRegionalManager, isAdminLike, stats]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <StatCard
                    key={c.title}
                    title={c.title}
                    value={c.value}
                    Icon={c.Icon}
                    variant={c.variant}
                />
            ))}
        </div>
    );
}
