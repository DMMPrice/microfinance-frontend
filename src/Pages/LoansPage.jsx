// src/pages/LoansPage.jsx
import {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Plus, RefreshCw, Search, Eye} from "lucide-react";

import CreateLoanDialog from "@/Component/Loan/CreateLoanDialog.jsx";
import LoanSummaryDrawer from "@/Component/Loan/LoanSummaryDrawer.jsx";

import {
    useLoanStats,
    useDueInstallments,
    useCollectionsByLO,
    useLoansByMember,
    useLoansByGroup,
} from "@/hooks/useLoans.js";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function LoansPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    const [asOn, setAsOn] = useState(todayISO());
    const [loId, setLoId] = useState("");

    const [memberId, setMemberId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [groupStatus, setGroupStatus] = useState("");

    const statsQ = useLoanStats();
    const dueQ = useDueInstallments(asOn);
    const collectionsQ = useCollectionsByLO(loId, asOn);
    const byMemberQ = useLoansByMember(memberId);
    const byGroupQ = useLoansByGroup(groupId, groupStatus || undefined);

    const openSummary = (loanId) => {
        setSelectedLoanId(loanId);
        setSummaryOpen(true);
    };

    const statsCards = useMemo(() => {
        const d = statsQ.data || {};
        const keys = ["DISBURSED", "ACTIVE", "CLOSED", "CANCELLED", "OTHER"];
        return keys.map((k) => ({k, v: d[k] ?? 0}));
    }, [statsQ.data]);

    return (
        <div className="space-y-4">
            {/* Top header row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Loans</h1>
                    <p className="text-sm text-muted-foreground">
                        Create loans, view due installments, collections, and summaries.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => statsQ.refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-2"/>
                        Create Loan
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="stats" className="w-full">
                <TabsList className="w-full md:w-auto">
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                    <TabsTrigger value="due">Installments Due</TabsTrigger>
                    <TabsTrigger value="collections">Collections (by LO)</TabsTrigger>
                    <TabsTrigger value="search">Search Loans</TabsTrigger>
                </TabsList>

                {/* ============ STATS ============ */}
                <TabsContent value="stats" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {statsQ.isLoading
                            ? Array.from({length: 5}).map((_, i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-4 w-24"/>
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-8 w-16"/>
                                    </CardContent>
                                </Card>
                            ))
                            : statsCards.map((x) => (
                                <Card key={x.k} className="rounded-xl">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-muted-foreground">{x.k}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{x.v}</div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                </TabsContent>

                {/* ============ DUE INSTALLMENTS ============ */}
                <TabsContent value="due" className="mt-4">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Installments Due</CardTitle>
                            <CardDescription>Shows all unpaid installments due on or before selected
                                date.</CardDescription>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">As on</span>
                                    <Input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)}
                                           className="w-[180px]"/>
                                </div>
                                <Button variant="outline" onClick={() => dueQ.refetch()}>
                                    <RefreshCw className="h-4 w-4 mr-2"/>
                                    Reload
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {dueQ.isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-10 w-full"/>
                                </div>
                            ) : dueQ.isError ? (
                                <div className="text-sm text-destructive">
                                    {dueQ.error?.response?.data?.detail || dueQ.error?.message || "Failed to load"}
                                </div>
                            ) : (
                                <Table>
                                    <thead>
                                    <TrH>
                                        <Th>Due Date</Th>
                                        <Th>Group</Th>
                                        <Th>Member</Th>
                                        <Th className="text-right">Due Left</Th>
                                        <Th>Loan</Th>
                                        <Th/>
                                    </TrH>
                                    </thead>
                                    <tbody>
                                    {(dueQ.data || []).map((r) => (
                                        <Tr key={r.installment_id}>
                                            <Td>{r.due_date}</Td>
                                            <Td>
                                                <div className="font-medium">{r.group_name}</div>
                                                <div className="text-xs text-muted-foreground">#{r.group_id}</div>
                                            </Td>
                                            <Td>
                                                <div className="font-medium">{r.member_name}</div>
                                                <div className="text-xs text-muted-foreground">#{r.member_id}</div>
                                            </Td>
                                            <Td className="text-right font-semibold">{fmtMoney(r.due_left)}</Td>
                                            <Td>
                                                <Badge variant="secondary">Loan #{r.loan_id}</Badge>
                                                <div className="text-xs text-muted-foreground">Inst
                                                    #{r.installment_no}</div>
                                            </Td>
                                            <Td className="text-right">
                                                <Button variant="ghost" size="sm"
                                                        onClick={() => openSummary(r.loan_id)}>
                                                    <Eye className="h-4 w-4 mr-2"/>
                                                    View
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                    {(!dueQ.data || dueQ.data.length === 0) && (
                                        <Tr>
                                            <Td colSpan={6} className="text-center text-muted-foreground py-10">
                                                No due installments for selected date.
                                            </Td>
                                        </Tr>
                                    )}
                                    </tbody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============ COLLECTIONS BY LO ============ */}
                <TabsContent value="collections" className="mt-4">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Collections by Loan Officer</CardTitle>
                            <CardDescription>Due list for one LO up to selected date.</CardDescription>

                            <div className="flex flex-col lg:flex-row gap-2 lg:items-center mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">LO ID</span>
                                    <Input value={loId} onChange={(e) => setLoId(e.target.value)} placeholder="e.g. 3"
                                           className="w-[180px]"/>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">As on</span>
                                    <Input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)}
                                           className="w-[180px]"/>
                                </div>
                                <Button variant="outline" onClick={() => collectionsQ.refetch()} disabled={!loId}>
                                    <RefreshCw className="h-4 w-4 mr-2"/>
                                    Load
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {!loId ? (
                                <div className="text-sm text-muted-foreground">Enter LO ID to load collections.</div>
                            ) : collectionsQ.isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-10 w-full"/>
                                    <Skeleton className="h-10 w-full"/>
                                </div>
                            ) : collectionsQ.isError ? (
                                <div className="text-sm text-destructive">
                                    {collectionsQ.error?.response?.data?.detail || collectionsQ.error?.message || "Failed to load"}
                                </div>
                            ) : (
                                <Table>
                                    <thead>
                                    <TrH>
                                        <Th>Group</Th>
                                        <Th>Member</Th>
                                        <Th>Due Date</Th>
                                        <Th className="text-right">Due Left</Th>
                                        <Th className="text-right">Advance</Th>
                                        <Th>Status</Th>
                                        <Th/>
                                    </TrH>
                                    </thead>
                                    <tbody>
                                    {(collectionsQ.data || []).map((r) => (
                                        <Tr key={`${r.loan_id}-${r.installment_no}-${r.member_id}`}>
                                            <Td>
                                                <div className="font-medium">{r.group_name}</div>
                                                <div className="text-xs text-muted-foreground">#{r.group_id}</div>
                                            </Td>
                                            <Td>
                                                <div className="font-medium">{r.member_name}</div>
                                                <div className="text-xs text-muted-foreground">#{r.member_id}</div>
                                            </Td>
                                            <Td>
                                                <div className="font-medium">{r.due_date}</div>
                                                <div className="text-xs text-muted-foreground">Inst
                                                    #{r.installment_no}</div>
                                            </Td>
                                            <Td className="text-right font-semibold">{fmtMoney(r.due_left)}</Td>
                                            <Td className="text-right">{fmtMoney(r.advance_balance)}</Td>
                                            <Td>
                                                <Badge variant="secondary">{r.status}</Badge>
                                            </Td>
                                            <Td className="text-right">
                                                <Button variant="ghost" size="sm"
                                                        onClick={() => openSummary(r.loan_id)}>
                                                    <Eye className="h-4 w-4 mr-2"/>
                                                    View
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                    {(!collectionsQ.data || collectionsQ.data.length === 0) && (
                                        <Tr>
                                            <Td colSpan={7} className="text-center text-muted-foreground py-10">
                                                No collection rows found.
                                            </Td>
                                        </Tr>
                                    )}
                                    </tbody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============ SEARCH ============ */}
                <TabsContent value="search" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Search by Member */}
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>Loans by Member</CardTitle>
                                <CardDescription>Fetch loans using Member ID.</CardDescription>
                                <div className="flex items-center gap-2 mt-2">
                                    <Input value={memberId} onChange={(e) => setMemberId(e.target.value)}
                                           placeholder="Member ID"/>
                                    <Button variant="outline" onClick={() => byMemberQ.refetch()} disabled={!memberId}>
                                        <Search className="h-4 w-4 mr-2"/>
                                        Search
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <LoansMiniTable
                                    q={byMemberQ}
                                    onView={(id) => openSummary(id)}
                                />
                            </CardContent>
                        </Card>

                        {/* Search by Group */}
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>Loans by Group</CardTitle>
                                <CardDescription>Fetch loans using Group ID (optional status).</CardDescription>
                                <div className="grid gap-2 mt-2">
                                    <div className="flex items-center gap-2">
                                        <Input value={groupId} onChange={(e) => setGroupId(e.target.value)}
                                               placeholder="Group ID"/>
                                        <Input value={groupStatus} onChange={(e) => setGroupStatus(e.target.value)}
                                               placeholder="Status (optional)"/>
                                    </div>
                                    <Button variant="outline" onClick={() => byGroupQ.refetch()} disabled={!groupId}>
                                        <Search className="h-4 w-4 mr-2"/>
                                        Search
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <LoansMiniTable
                                    q={byGroupQ}
                                    onView={(id) => openSummary(id)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <CreateLoanDialog open={createOpen} onOpenChange={setCreateOpen}/>

            <LoanSummaryDrawer
                open={summaryOpen}
                onOpenChange={setSummaryOpen}
                loanId={selectedLoanId}
            />
        </div>
    );
}

function LoansMiniTable({q, onView}) {
    if (!q.enabled && q.isIdle) {
        return <div className="text-sm text-muted-foreground">Enter search input and click Search.</div>;
    }

    if (q.isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full"/>
                <Skeleton className="h-10 w-full"/>
                <Skeleton className="h-10 w-full"/>
            </div>
        );
    }

    if (q.isError) {
        return (
            <div className="text-sm text-destructive">
                {q.error?.response?.data?.detail || q.error?.message || "Failed to load"}
            </div>
        );
    }

    const rows = q.data || [];
    return (
        <Table>
            <thead>
            <TrH>
                <Th>Loan ID</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th/>
            </TrH>
            </thead>
            <tbody>
            {rows.map((r) => (
                <Tr key={r.loan_id}>
                    <Td>
                        <div className="font-medium">#{r.loan_id}</div>
                        <div className="text-xs text-muted-foreground">{r.loan_account_no}</div>
                    </Td>
                    <Td>
                        <Badge variant="secondary">{r.status}</Badge>
                    </Td>
                    <Td className="text-right">{fmtMoney(r.total_disbursed_amount)}</Td>
                    <Td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onView(r.loan_id)}>
                            <Eye className="h-4 w-4 mr-2"/>
                            View
                        </Button>
                    </Td>
                </Tr>
            ))}
            {rows.length === 0 && (
                <Tr>
                    <Td colSpan={4} className="text-center text-muted-foreground py-10">
                        No loans found.
                    </Td>
                </Tr>
            )}
            </tbody>
        </Table>
    );
}

/* ====== tiny table primitives (keeps file self-contained) ====== */
function Table({children}) {
    return <table className="w-full text-sm border rounded-lg overflow-hidden">{children}</table>;
}

function TrH({children}) {
    return <tr className="bg-muted/40">{children}</tr>;
}

function Tr({children}) {
    return <tr className="border-t">{children}</tr>;
}

function Th({children, className = ""}) {
    return <th className={`text-left font-semibold px-3 py-2 ${className}`}>{children}</th>;
}

function Td({children, className = ""}) {
    return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function fmtMoney(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
