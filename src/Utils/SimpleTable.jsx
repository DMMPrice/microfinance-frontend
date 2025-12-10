// src/Utils/SimpleTable.jsx
import React from "react";
import {Card, CardContent} from "@/components/ui/card";

export function SimpleTable({
                                columns = [],
                                data = [],
                                isLoading = false,
                                isError = false,
                                emptyMessage = "No records found",
                            }) {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`text-left px-4 py-2 font-medium text-muted-foreground ${col.headerClassName || ""}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {isLoading && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-4 text-center text-muted-foreground"
                                >
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {isError && !isLoading && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-4 text-center text-destructive"
                                >
                                    Failed to load data from server.
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isError && data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-4 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}

                        {!isLoading &&
                            !isError &&
                            data.length > 0 &&
                            data.map((row) => (
                                <tr
                                    key={row.id || row.region_id || row._id}
                                    className="border-t hover:bg-muted/40"
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-2 ${col.cellClassName || ""}`}
                                        >
                                            {col.render
                                                ? col.render(row)
                                                : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
