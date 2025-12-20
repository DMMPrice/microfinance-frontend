// src/pages/loans/LoanSearchSection.jsx
import React, {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Search, Eye, Plus} from "lucide-react";

import {useLoansByMember, useLoansByGroup} from "@/hooks/useLoans.js";
import {DataTable, EmptyHint, ErrBox, SkRows, fmtMoney} from "@/Component/Loan/Components/loans.ui.jsx";

export default function LoanSearchSection({onView, onCreate}) {
    const [memberId, setMemberId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [groupStatus, setGroupStatus] = useState("");

    const byMemberQ = useLoansByMember(memberId);
    const byGroupQ = useLoansByGroup(groupId, groupStatus || undefined);

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* by member */}
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Loans by Member</CardTitle>
                    <CardDescription>Enter Member ID and press search.</CardDescription>

                    <div className="flex items-center gap-2 mt-2">
                        <Input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="Member ID"/>
                        <Button variant="outline" onClick={() => byMemberQ.refetch()} disabled={!memberId}>
                            <Search className="h-4 w-4 mr-2"/>
                            Search
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {!memberId ? (
                        <EmptyHint title="Enter Member ID" desc="Example: 101"/>
                    ) : byMemberQ.isLoading ? (
                        <SkRows/>
                    ) : byMemberQ.isError ? (
                        <ErrBox err={byMemberQ.error}/>
                    ) : !byMemberQ.data?.length ? (
                        <EmptyHint
                            title="No loans found for this member."
                            desc="Check member ID or create a loan."
                            action={
                                <Button onClick={onCreate}>
                                    <Plus className="h-4 w-4 mr-2"/>
                                    Create Loan
                                </Button>
                            }
                        />
                    ) : (
                        <LoansListTable rows={byMemberQ.data} onView={onView}/>
                    )}
                </CardContent>
            </Card>

            {/* by group */}
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Loans by Group</CardTitle>
                    <CardDescription>Enter Group ID (status optional).</CardDescription>

                    <div className="grid gap-2 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Group ID"/>
                            <Input
                                value={groupStatus}
                                onChange={(e) => setGroupStatus(e.target.value)}
                                placeholder="Status (optional)"
                            />
                        </div>
                        <Button variant="outline" onClick={() => byGroupQ.refetch()} disabled={!groupId}>
                            <Search className="h-4 w-4 mr-2"/>
                            Search
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {!groupId ? (
                        <EmptyHint title="Enter Group ID" desc="Example: 10"/>
                    ) : byGroupQ.isLoading ? (
                        <SkRows/>
                    ) : byGroupQ.isError ? (
                        <ErrBox err={byGroupQ.error}/>
                    ) : !byGroupQ.data?.length ? (
                        <EmptyHint title="No loans found for this group."
                                   desc="Check group ID or remove status filter."/>
                    ) : (
                        <LoansListTable rows={byGroupQ.data} onView={onView}/>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function LoansListTable({rows, onView}) {
    return (
        <DataTable
            columns={["Loan ID", "Account No", "Status", "Total", ""]}
            rows={(rows || []).map((r) => ({
                key: r.loan_id,
                cells: [
                    <div key="id" className="font-semibold">
                        #{r.loan_id}
                    </div>,
                    <div key="ac" className="text-sm">
                        {r.loan_account_no || "-"}
                    </div>,
                    <Badge key="st" variant="secondary">
                        {r.status}
                    </Badge>,
                    <div key="t" className="text-right font-semibold">
                        {fmtMoney(r.total_disbursed_amount)}
                    </div>,
                    <div key="a" className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onView?.(r.loan_id)}>
                            <Eye className="h-4 w-4 mr-2"/>
                            View
                        </Button>
                    </div>,
                ],
            }))}
        />
    );
}
