// src/Component/Reports/GroupReportsPage.jsx
import React from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";

export default function GroupReportsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Reports</CardTitle>
                <CardDescription>
                    Filters + tables + CSV/PDF exports will be added here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Coming Soon</Badge>
                    <Badge variant="outline">Group-wise</Badge>
                    <Badge variant="outline">Date range</Badge>
                    <Badge variant="outline">Download</Badge>
                </div>
            </CardContent>
        </Card>
    );
}
