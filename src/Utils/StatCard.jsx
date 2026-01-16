// src/Utils/StatCard.jsx
import React from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/card";
import {cn} from "@/lib/utils";

const VARIANTS = {
    blue: {
        card: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-background border-blue-200/60 dark:border-blue-900/60",
        iconWrap: "bg-blue-100 dark:bg-blue-900/40",
        icon: "text-blue-700 dark:text-blue-300",
    },
    green: {
        card: "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-background border-emerald-200/60 dark:border-emerald-900/60",
        iconWrap: "bg-emerald-100 dark:bg-emerald-900/40",
        icon: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
        card: "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-background border-amber-200/60 dark:border-amber-900/60",
        iconWrap: "bg-amber-100 dark:bg-amber-900/40",
        icon: "text-amber-700 dark:text-amber-300",
    },
    purple: {
        card: "bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-background border-violet-200/60 dark:border-violet-900/60",
        iconWrap: "bg-violet-100 dark:bg-violet-900/40",
        icon: "text-violet-700 dark:text-violet-300",
    },
    red: {
        card: "bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-background border-rose-200/60 dark:border-rose-900/60",
        iconWrap: "bg-rose-100 dark:bg-rose-900/40",
        icon: "text-rose-700 dark:text-rose-300",
    },
};

export default function StatCard({
                                     title,
                                     value,
                                     subtitle,
                                     Icon,
                                     to,
                                     className,
                                     variant = "blue", // ✅ NEW
                                 }) {
    const navigate = useNavigate();
    const clickable = Boolean(to);

    const v = VARIANTS[variant] || VARIANTS.blue;

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
                "transition border",
                v.card,
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
                        <div className={cn("rounded-lg p-2", v.iconWrap)}>
                            <Icon className={cn("h-5 w-5", v.icon)}/>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
