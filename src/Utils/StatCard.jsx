// src/Component/Home/components/StatCard.jsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";

export default function StatCard({title, value, subtitle, Icon}) {
    return (
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {title}
                        </CardTitle>
                        <div className="text-3xl font-semibold tracking-tight">
                            {value}
                        </div>
                    </div>

                    <div className="h-10 w-10 rounded-xl border bg-muted/40 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground"/>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {subtitle ? (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                ) : (
                    <div className="h-4"/>
                )}
            </CardContent>
        </Card>
    );
}
