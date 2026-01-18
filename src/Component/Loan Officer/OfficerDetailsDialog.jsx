// src/Component/Loan Officer/OfficerDetailsDialog.jsx
import {useEffect, useMemo, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Trash2, Users2} from "lucide-react";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";

import {useLoanOfficerGroupSummary} from "@/hooks/useLoanOfficers.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";

export default function OfficerDetailsDialog({
                                                 open,
                                                 onClose,
                                                 officer,
                                                 onDelete,
                                                 branchRegionLabel,
                                                 groupCount,
                                             }) {
    // ✅ hooks always called
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    const loId = officer?.lo_id ?? null;

    // ✅ fetch groups summary
    const {
        data: groupSummary,
        isLoading: isGroupsLoading,
        isError: isGroupsError,
        error: groupsError,
    } = useLoanOfficerGroupSummary(loId, {enabled: Boolean(open && loId)});

    // ✅ fetch branch/region masters for name lookup
    const {getBranchName} = useBranches(null);
    const {getRegionName} = useRegions();

    useEffect(() => {
        if (officer) {
            const emp = officer.employee;
            const user = emp?.user;
            setEmail(user?.email || "");
            setUsername(user?.username || "");
        } else {
            setEmail("");
            setUsername("");
        }
    }, [officer, open]);

    // ✅ exact response mapping
    const groupsArr = useMemo(() => {
        const first = Array.isArray(groupSummary) ? groupSummary[0] : null;
        return Array.isArray(first?.groups) ? first.groups : [];
    }, [groupSummary]);

    // ✅ meeting day summary chips
    const meetingDaySummary = useMemo(() => {
        const map = new Map();
        for (const g of groupsArr) {
            const day = g?.meeting_day || "Unknown";
            map.set(day, (map.get(day) || 0) + 1);
        }
        return Array.from(map.entries()).map(([day, count]) => ({day, count}));
    }, [groupsArr]);

    // ✅ safe rendering after hooks
    if (!officer) return null;

    const emp = officer.employee;
    const loanOfficerName = emp?.full_name || "N/A";
    const employeeName = username || email || "N/A";

    const handleDeleteClick = () => {
        if (!onDelete) return;
        if (onDelete.length >= 1) onDelete(officer.lo_id);
        else onDelete();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Loan Officer Details</DialogTitle>
                </DialogHeader>

                {/* ✅ Tabs */}
                <Tabs defaultValue="quick" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="quick">Quick Info</TabsTrigger>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                    </TabsList>

                    {/* ---------------- Quick Info Tab ---------------- */}
                    <TabsContent value="quick" className="pt-3">
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="font-medium">Full Name</p>
                                    <p className="text-muted-foreground">{loanOfficerName}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Email</p>
                                    <p className="text-muted-foreground">{email || "N/A"}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Phone</p>
                                    <p className="text-muted-foreground">{emp?.phone || "N/A"}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Username</p>
                                    <p className="text-muted-foreground">{username || "N/A"}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Branch / Region</p>
                                    <p className="text-muted-foreground">{branchRegionLabel || "N/A"}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Groups Assigned</p>
                                    <p className="text-muted-foreground">{groupCount ?? 0}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Loan Officer</p>
                                    <p className="text-muted-foreground">{loanOfficerName}</p>
                                </div>

                                <div>
                                    <p className="font-medium">Employee</p>
                                    <p className="text-muted-foreground">{employeeName}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ---------------- Summary Tab ---------------- */}
                    <TabsContent value="summary" className="pt-3">
                        <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium flex items-center gap-2">
                                    <Users2 className="h-4 w-4"/>
                                    Group Summary
                                </p>

                                <Badge variant="secondary" className="rounded-lg">
                                    {groupsArr.length}
                                </Badge>
                            </div>

                            {/* ✅ day summary chips */}
                            {meetingDaySummary.length > 0 && !isGroupsLoading && !isGroupsError ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {meetingDaySummary.map((x) => (
                                        <Badge key={x.day} variant="outline" className="rounded-lg">
                                            {x.day}: {x.count}
                                        </Badge>
                                    ))}
                                </div>
                            ) : null}

                            <div className="mt-3">
                                {isGroupsLoading ? (
                                    <p className="text-muted-foreground">Loading group summary...</p>
                                ) : isGroupsError ? (
                                    <p className="text-destructive">
                                        Failed to load groups: {groupsError?.message || "Unknown error"}
                                    </p>
                                ) : groupsArr.length === 0 ? (
                                    <p className="text-muted-foreground">No groups assigned.</p>
                                ) : (
                                    <div className="overflow-hidden rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/40">
                                            <tr className="text-left">
                                                <th className="px-3 py-2 font-medium">Group Name</th>
                                                <th className="px-3 py-2 font-medium">Meeting Day</th>
                                                <th className="px-3 py-2 font-medium">Branch</th>
                                                <th className="px-3 py-2 font-medium">Region</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {groupsArr.map((g) => {
                                                const branchName = getBranchName(g.branch_id) || String(g.branch_id ?? "-");
                                                const regionName = getRegionName(g.region_id) || String(g.region_id ?? "-");

                                                return (
                                                    <tr key={String(g.group_id)} className="border-t">
                                                        <td className="px-3 py-2 font-medium">{g.group_name || "-"}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{g.meeting_day || "-"}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{branchName}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{regionName}</td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* footer actions */}
                <div className="border-t pt-4 flex justify-end gap-2">
                    <Button variant="destructive" onClick={handleDeleteClick}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
