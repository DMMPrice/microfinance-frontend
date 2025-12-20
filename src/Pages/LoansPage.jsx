// src/pages/LoansPage.jsx
import {useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Skeleton} from "@/components/ui/skeleton";
import {Plus, RefreshCw} from "lucide-react";

import CreateLoanDialog from "@/Component/Loan/CreateLoanDialog.jsx";
import LoanSummaryDrawer from "@/Component/Loan/LoanSummaryDrawer.jsx";

import {useLoanStats} from "@/hooks/useLoans";

// ✅ sections
import LoansAllSection from "@/Component/Loan/Components/LoansAllSection.jsx";
import LoanDueSection from "@/Component/Loan/Components/LoanDueSection.jsx";
import LoanCollectionsSection from "@/Component/Loan/Components/LoanCollectionsSection.jsx";

const TAB_DEFAULT = "due";
const TAB_KEYS = ["all", "due", "collections"];

function safeTab(value) {
    if (!value) return TAB_DEFAULT;
    return TAB_KEYS.includes(value) ? value : TAB_DEFAULT;
}

export default function LoansPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = safeTab(searchParams.get("tab"));

    const setTab = (next) => {
        setSearchParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                p.set("tab", next);
                return p;
            },
            {replace: true}
        );
    };

    const [createOpen, setCreateOpen] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    const statsQ = useLoanStats();

    const openSummary = (loanId) => {
        setSelectedLoanId(loanId);
        setSummaryOpen(true);
    };

    // ✅ KPI keys should follow API response (show only those present)
    const statsCards = useMemo(() => {
        const d = statsQ.data || {};

        const preferred = ["DISBURSED", "ACTIVE", "CLOSED", "CANCELLED", "OTHER"];
        const available = preferred.filter((k) =>
            Object.prototype.hasOwnProperty.call(d, k)
        );
        const extras = Object.keys(d).filter((k) => !preferred.includes(k));
        const keys = [...available, ...extras];

        const finalKeys = keys.length ? keys : ["DISBURSED", "ACTIVE", "CLOSED", "OTHER"];
        return finalKeys.map((k) => ({k, v: Number(d[k] ?? 0)}));
    }, [statsQ.data]);

    const kpiCols = Math.min(statsCards.length || 4, 5);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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

            {/* KPI row */}
            <div
                className="grid gap-4 sm:grid-cols-2"
                style={{gridTemplateColumns: `repeat(${kpiCols}, minmax(0, 1fr))`}}
            >
                {statsQ.isLoading
                    ? Array.from({length: statsCards.length || 4}).map((_, i) => (
                        <Card key={i} className="rounded-xl">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-20"/>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-10"/>
                            </CardContent>
                        </Card>
                    ))
                    : statsCards.map((x) => (
                        <Card key={x.k} className="rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-muted-foreground">
                                    {x.k}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{x.v}</div>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full md:w-auto overflow-x-auto">
                    <TabsTrigger value="all">All Loans</TabsTrigger>
                    <TabsTrigger value="due">Installments Due</TabsTrigger>
                    <TabsTrigger value="collections">Collections (by LO)</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Content */}
            {tab === "all" && (
                <LoansAllSection
                    onCreate={() => setCreateOpen(true)}
                    onOpenSummary={openSummary}
                />
            )}

            {tab === "due" && <LoanDueSection onOpenSummary={openSummary}/>}

            {tab === "collections" && (
                <LoanCollectionsSection onOpenSummary={openSummary}/>
            )}

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
