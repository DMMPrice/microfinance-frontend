import {useEffect, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Search, Eye} from "lucide-react";
import {useLoanSummary} from "@/hooks/useLoans";

function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function QuickLoanLookup({onView}) {
    const [loanIdText, setLoanIdText] = useState("");
    const [loanId, setLoanId] = useState(null);

    const q = useLoanSummary(loanId);

    useEffect(() => {
        // Clear old data when input is cleared
        if (!loanIdText.trim()) setLoanId(null);
    }, [loanIdText]);

    const run = () => {
        const id = Number(loanIdText);
        if (!id || Number.isNaN(id)) return;
        setLoanId(id);
    };

    return (
        <Card className="rounded-xl">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Loan Lookup</CardTitle>
                <CardDescription>Enter Loan ID to instantly view loan details.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        value={loanIdText}
                        onChange={(e) => setLoanIdText(e.target.value)}
                        placeholder="Enter Loan ID (e.g. 1)"
                    />
                    <Button onClick={run} className="sm:w-[140px]">
                        <Search className="h-4 w-4 mr-2"/>
                        Find
                    </Button>
                </div>

                {!loanId && (
                    <div className="text-sm text-muted-foreground">
                        Tip: You can also open summary from “Due Installments” / “Collections” rows.
                    </div>
                )}

                {q.isLoading && loanId && (
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-2/3"/>
                        <Skeleton className="h-20 w-full"/>
                    </div>
                )}

                {q.isError && loanId && (
                    <div className="text-sm text-destructive">
                        {q.error?.response?.data?.detail || q.error?.message || "Loan not found"}
                    </div>
                )}

                {q.data && (
                    <div className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-semibold">{q.data.loan_account_no}</div>
                                <div className="text-xs text-muted-foreground">
                                    {q.data.member_name} • {q.data.group_name}
                                </div>
                            </div>
                            <Badge variant="secondary">{q.data.status}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                            <Mini label="Total" value={money(q.data.total_disbursed_amount)}/>
                            <Mini label="Paid" value={money(q.data.total_paid)}/>
                            <Mini label="Outstanding" value={money(q.data.outstanding)}/>
                            <Mini label="Next Due" value={q.data.next_due_date || "-"}/>
                            <Mini label="Next Due Amt"
                                  value={q.data.next_due_amount != null ? money(q.data.next_due_amount) : "-"}/>
                            <Mini label="Advance" value={money(q.data.advance_balance)}/>
                        </div>

                        <div className="flex justify-end mt-3">
                            <Button variant="outline" onClick={() => onView(q.data.loan_id)}>
                                <Eye className="h-4 w-4 mr-2"/>
                                Open Full Summary
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Mini({label, value}) {
    return (
        <div className="rounded-md bg-muted/40 p-2">
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className="text-sm font-semibold">{value}</div>
        </div>
    );
}
