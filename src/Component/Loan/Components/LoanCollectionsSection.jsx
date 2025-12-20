// src/pages/loans/LoanCollectionsSection.jsx
import React, {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {RefreshCw, Eye} from "lucide-react";

import {useCollectionsByLO} from "@/hooks/useLoans.js";
import {DataTable, EmptyHint, ErrBox, SkRows, fmtMoney, todayISO} from "@/Component/Loan/Components/loans.ui.jsx";

export default function LoanCollectionsSection({onView}) {
    const [asOn, setAsOn] = useState(todayISO());
    const [loId, setLoId] = useState("");

    const collectionsQ = useCollectionsByLO(loId, asOn);

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>Collections by Loan Officer</CardTitle>
                <CardDescription>Due list for one LO up to selected date.</CardDescription>

                <div className="flex flex-col lg:flex-row gap-2 lg:items-center mt-3">
                    <Input
                        value={loId}
                        onChange={(e) => setLoId(e.target.value)}
                        placeholder="Enter LO ID (e.g. 3)"
                        className="lg:w-[220px]"
                    />
                    <Input
                        type="date"
                        value={asOn}
                        onChange={(e) => setAsOn(e.target.value)}
                        className="lg:w-[180px]"
                    />
                    <Button variant="outline" onClick={() => setAsOn(todayISO())}>
                        Today
                    </Button>
                    <Button variant="outline" onClick={() => collectionsQ.refetch()} disabled={!loId}>
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        Load
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {!loId ? (
                    <EmptyHint title="Enter LO ID" desc="Collections require LO ID + as-on date."/>
                ) : collectionsQ.isLoading ? (
                    <SkRows/>
                ) : collectionsQ.isError ? (
                    <ErrBox err={collectionsQ.error}/>
                ) : !collectionsQ.data?.length ? (
                    <EmptyHint title="No collection rows found." desc="Try a different LO ID or change the date."/>
                ) : (
                    <DataTable
                        columns={["Group", "Member", "Due Date", "Due Left", "Advance", "Status", ""]}
                        rows={(collectionsQ.data || []).map((r) => ({
                            key: `${r.loan_id}-${r.installment_no}-${r.member_id}`,
                            cells: [
                                <div key="g">
                                    <div className="font-medium">{r.group_name}</div>
                                    <div className="text-xs text-muted-foreground">#{r.group_id}</div>
                                </div>,
                                <div key="m">
                                    <div className="font-medium">{r.member_name}</div>
                                    <div className="text-xs text-muted-foreground">#{r.member_id}</div>
                                </div>,
                                <div key="d">
                                    <div className="font-medium">{r.due_date}</div>
                                    <div className="text-xs text-muted-foreground">Inst #{r.installment_no}</div>
                                </div>,
                                <div key="dl" className="text-right font-semibold">
                                    {fmtMoney(r.due_left)}
                                </div>,
                                <div key="adv" className="text-right">
                                    {fmtMoney(r.advance_balance)}
                                </div>,
                                <Badge key="s" variant="secondary">
                                    {r.status}
                                </Badge>,
                                <div key="a" className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onView?.(r.loan_id)}>
                                        <Eye className="h-4 w-4 mr-2"/>
                                        View
                                    </Button>
                                </div>,
                            ],
                        }))}
                    />
                )}
            </CardContent>
        </Card>
    );
}
