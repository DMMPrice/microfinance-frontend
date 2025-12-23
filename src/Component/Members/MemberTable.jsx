// src/Component/Home/Main Components/members/MemberTable.jsx
import React from "react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {Pencil, Trash2} from "lucide-react";

// ✅ add this
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

function getInitials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "MB";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MemberTable({
                                        isLoading,
                                        rows = [],
                                        onEdit,
                                        onDeactivate,
                                        isDeleting,
                                    }) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Officer</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {isLoading ? (
                        Array.from({length: 8}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={8}>
                                    <Skeleton className="h-6 w-full"/>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                                No members found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map(({m, info}) => {
                            const active = Boolean(m.is_active ?? true);
                            const hasPhoto = Boolean(m.photo_b64 && String(m.photo_b64).trim().length > 0);
                            const avatarSrc = hasPhoto ? `data:image/*;base64,${m.photo_b64}` : "";

                            return (
                                <TableRow key={m.member_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            {/* ✅ Avatar instead of NA/broken image */}
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={avatarSrc} alt={m.full_name || "member"}/>
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(m.full_name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="leading-tight">
                                                <div>{m.full_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {m.dob ? `DOB: ${m.dob}` : "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>{m.phone}</TableCell>
                                    <TableCell>{info.group}</TableCell>
                                    <TableCell>{info.officer}</TableCell>
                                    <TableCell>{info.branch}</TableCell>
                                    <TableCell>{info.region}</TableCell>

                                    <TableCell>
                                        {active ? (
                                            <Badge variant="secondary">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive">Inactive</Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="inline-flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                                                <Pencil className="mr-2 h-4 w-4"/>
                                                Edit
                                            </Button>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isDeleting}
                                                onClick={() => onDeactivate(m)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                Deactivate
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
