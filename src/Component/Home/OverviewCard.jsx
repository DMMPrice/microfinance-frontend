// src/Component/Home/components/OverviewCard.jsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function OverviewCard() {
    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Welcome to Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Use the sidebar to navigate to different management sections.
                </p>
            </CardContent>
        </Card>
    );
}
