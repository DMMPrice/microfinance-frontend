// src/Utils/StatCard.jsx  (as you shared, keep same)
import React from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/card";
import {cn} from "@/lib/utils";

export default function StatCard({title, value, subtitle, Icon, to, className}) {
    const navigate = useNavigate();
    const clickable = Boolean(to);

    const onClick = () => {
        if (to) navigate(to);
    };

    const onKeyDown = (e) => {
        if (!to) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(to);
        }
    };

    return (
        <Card
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? onClick : undefined}
            onKeyDown={clickable ? onKeyDown : undefined}
            className={cn(
                "transition",
                clickable && "cursor-pointer hover:shadow-md active:scale-[0.99]",
                className
            )}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-semibold leading-none">{value}</p>
                        {subtitle ? (
                            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                        ) : null}
                    </div>

                    {Icon ? (
                        <div className="rounded-lg p-2 bg-secondary">
                            <Icon className="h-5 w-5 text-primary"/>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
