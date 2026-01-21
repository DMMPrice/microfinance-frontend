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
import {Trash2, Users2, Mail, Phone, User as UserIcon, MapPin} from "lucide-react";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";

import {useLoanOfficerGroupSummary} from "@/hooks/useLoanOfficers.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";

// ✅ your reusable table
import CommonTable from "@/Utils/CommonTable.jsx"; // adjust path if needed

function InfoRow({icon: Icon, label, value}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3">
            <div className="mt-0.5 rounded-md border bg-background p-2">
                <Icon className="h-4 w-4 text-muted-foreground"/>
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold truncate">{value || "N/A"}</p>
            </div>
        </div>
    );
}

export default function OfficerDetailsDialog({
                                                 open,
                                                 onClose,
                                                 officer,
                                                 onDelete,
                                                 branchRegionLabel,
                                                 groupCount,
                                             }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    const loId = officer?.lo_id ?? null;

    const {
        data: groupSummary,
        isLoading: isGroupsLoading,
        isError: isGroupsError,
        error: groupsError,
    } = useLoanOfficerGroupSummary(loId, {enabled: Boolean(open && loId)});

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

    const groupsArr = useMemo(() => {
        const first = Array.isArray(groupSummary) ? groupSummary[0] : null;
        return Array.isArray(first?.groups) ? first.groups : [];
    }, [groupSummary]);

    const meetingDaySummary = useMemo(() => {
        const map = new Map();
        for (const g of groupsArr) {
            const day = g?.meeting_day || "Unknown";
            map.set(day, (map.get(day) || 0) + 1);
        }
        return Array.from(map.entries()).map(([day, count]) => ({day, count}));
    }, [groupsArr]);

    const tableColumns = useMemo(
        () => ["Group Name", "Meeting Day", "Branch", "Region"],
        []
    );

    const tableRows = useMemo(() => {
        return (groupsArr || []).map((g) => {
            const branchName = getBranchName(g.branch_id) || String(g.branch_id ?? "-");
            const regionName = getRegionName(g.region_id) || String(g.region_id ?? "-");

            return {
                key: String(g.group_id ?? `${g.group_name}-${g.meeting_day}`),
                cells: [
                    <span className="font-medium">{g.group_name || "-"}</span>,
                    <span className="text-muted-foreground">{g.meeting_day || "-"}</span>,
                    <span className="text-muted-foreground">{branchName}</span>,
                    <span className="text-muted-foreground">{regionName}</span>,
                ],
            };
        });
    }, [groupsArr, getBranchName, getRegionName]);

    if (!officer) return null;

    const emp = officer.employee;
    const loanOfficerName = emp?.full_name || "N/A";
    const phone = emp?.phone || "N/A";
    const employeeName = username || email || "N/A";

    const handleDeleteClick = () => {
        if (!onDelete) return;
        if (onDelete.length >= 1) onDelete(officer.lo_id);
        else onDelete();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            {/* ✅ IMPORTANT: remove fixed height, keep max-height only */}
            <DialogContent className="max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Loan Officer Details</DialogTitle>
                </DialogHeader>

                {/* body */}
                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="quick" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="quick">Quick Info</TabsTrigger>
                            <TabsTrigger value="summary">Summary</TabsTrigger>
                        </TabsList>

                        {/* ---------------- Quick Info Tab (FIXED) ---------------- */}
                        <TabsContent value="quick" className="pt-4">
                            <div className="space-y-4">
                                {/* top chips */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="rounded-lg">
                                        Groups: {groupCount ?? 0}
                                    </Badge>
                                    {branchRegionLabel ? (
                                        <Badge variant="outline" className="rounded-lg">
                                            <MapPin className="mr-1 h-3.5 w-3.5"/>
                                            {branchRegionLabel}
                                        </Badge>
                                    ) : null}
                                </div>

                                {/* info grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoRow icon={UserIcon} label="Full Name" value={loanOfficerName}/>
                                    <InfoRow icon={Mail} label="Email" value={email || "N/A"}/>
                                    <InfoRow icon={Phone} label="Phone" value={phone}/>
                                    <InfoRow icon={UserIcon} label="Username / Employee" value={employeeName}/>
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
                                    {/* ✅ only scrollbar here */}
                                    <div className="max-h-[360px] overflow-auto pr-1">
                                        <CommonTable
                                            columns={tableColumns}
                                            rows={tableRows}
                                            isLoading={isGroupsLoading}
                                            isError={isGroupsError}
                                            error={groupsError}
                                            emptyTitle="No groups assigned."
                                            emptyDesc="This loan officer has no groups linked yet."
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* footer */}
                <div className="border-t pt-4 flex justify-end gap-2 shrink-0">
                    <Button variant="destructive" onClick={handleDeleteClick}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
