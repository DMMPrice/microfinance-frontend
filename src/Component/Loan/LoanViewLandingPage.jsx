import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";

export default function LoanViewLandingPage() {
    const [loanId, setLoanId] = useState("");
    const navigate = useNavigate();

    function go() {
        const id = String(loanId).trim();
        if (!id) return;
        navigate(`/dashboard/loans/view/${id}`);
    }

    return (
        <div className="max-w-xl">
            <Card>
                <CardHeader>
                    <CardTitle>Loan View</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-1">
                        <Label>Enter Loan ID</Label>
                        <Input
                            placeholder="Example: 1"
                            value={loanId}
                            onChange={(e) => setLoanId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && go()}
                        />
                    </div>

                    <Button onClick={go}>Open Loan</Button>
                </CardContent>
            </Card>
        </div>
    );
}
