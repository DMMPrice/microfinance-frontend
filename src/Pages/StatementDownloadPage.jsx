import React from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function StatementDownloadPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Statement Download</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                Coming soon: filters + export loan statement / ledger CSV/PDF.
            </CardContent>
        </Card>
    );
}
