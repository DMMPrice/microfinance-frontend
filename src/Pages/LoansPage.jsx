import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function LoansPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Loans</h1>
                <p className="text-muted-foreground">Create and manage loans</p>
            </div>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Loans Module</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Coming soon.
                </CardContent>
            </Card>
        </div>
    );
}
