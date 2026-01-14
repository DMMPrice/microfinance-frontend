// src/Component/Loan/Loan View/LoanViewLandingPage.jsx
import React, {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";
import {toast} from "@/components/ui/use-toast"; // if you have it
import {useResolveLoanId} from "@/hooks/useLoanResolver.js";

function readLoanAccountSuggestions() {
    try {
        const raw = localStorage.getItem("mf.loanAccountNos.v1");
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function isNumericId(v) {
    return /^\d+$/.test(String(v || "").trim());
}

export default function LoanViewLandingPage() {
    const [loanRef, setLoanRef] = useState("");
    const navigate = useNavigate();

    const suggestions = useMemo(() => readLoanAccountSuggestions(), []);

    // resolve only when it's an account no (not numeric)
    const {data: resolvedLoanId, isFetching} = useResolveLoanId(loanRef);

    function go() {
        const ref = String(loanRef).trim();
        if (!ref) return;

        // If user typed numeric loan_id, go directly
        if (isNumericId(ref)) {
            navigate(`/dashboard/loans/view/${encodeURIComponent(ref)}`);
            return;
        }

        // Otherwise, must resolve loan_id first
        if (!resolvedLoanId) {
            toast?.({
                title: "Loan not found",
                description: "Please check the Loan Account No and try again.",
                variant: "destructive",
            });
            return;
        }

        // ✅ Navigate using loan_id (so LoanViewPage will call backend by loan_id)
        navigate(`/dashboard/loans/view/${encodeURIComponent(String(resolvedLoanId))}`);
    }

    return (
        <div className="max-w-xl">
            <Card>
                <CardHeader>
                    <CardTitle>Loan View</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-1">
                        <Label>Enter Loan Account No</Label>
                        <Input
                            placeholder="LN-TIYA-01"
                            value={loanRef}
                            onChange={(e) => setLoanRef(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && go()}
                            list="loanAccountSuggestions"
                        />
                        <datalist id="loanAccountSuggestions">
                            {suggestions.map((x) => (
                                <option key={x} value={x}/>
                            ))}
                        </datalist>
                    </div>

                    <Button onClick={go} disabled={isFetching}>
                        {isFetching ? "Searching..." : "Open Loan"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
