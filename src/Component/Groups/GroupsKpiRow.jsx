// src/Component/Groups/GroupsKpiRow.jsx
import React, {useMemo} from "react";
import {Users, CalendarDays, Building2, UserRoundCheck} from "lucide-react";

import StatCard from "@/Utils/StatCard.jsx";
import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {getISTWeekday} from "@/Helpers/dateTimeIST.js";

function uniqCount(arr) {
    return new Set((arr || []).filter((v) => v !== null && v !== undefined && String(v) !== "")).size;
}

export default function GroupsKpiRow({groups = [], isLoading = false}) {
    const istToday = useMemo(() => getISTWeekday(), []);

    const stats = useMemo(() => {
        const list = Array.isArray(groups) ? groups : [];

        const todayMeetings = list.filter(
            (g) =>
                String(g?.meeting_day || "").trim().toLowerCase() ===
                String(istToday || "").trim().toLowerCase()
        ).length;

        const branchCount = uniqCount(list.map((g) => g?.branch_id));
        const officerCount = uniqCount(list.map((g) => g?.lo_id));

        return {
            total: list.length,
            todayMeetings,
            branches: branchCount,
            officers: officerCount,
        };
    }, [groups, istToday]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Array.from({length: 4}).map((_, i) => (
                    <Card key={i} className="border">
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-7 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
                title="Total Groups"
                value={stats.total}
                subtitle="In your current branch"
                Icon={Users}
                variant="blue"
            />

            <StatCard
                title="Today's Meetings"
                value={stats.todayMeetings}
                subtitle={istToday ? `Meeting day: ${istToday}` : null}
                Icon={CalendarDays}
                variant="amber"
            />

            <StatCard
                title="Branches Covered"
                value={stats.branches}
                subtitle="Branch Count"
                Icon={Building2}
                variant="purple"
            />

            <StatCard
                title="Loan Officers"
                value={stats.officers}
                subtitle="Total Loan Officers"
                Icon={UserRoundCheck}
                variant="green"
            />
        </div>
    );
}
