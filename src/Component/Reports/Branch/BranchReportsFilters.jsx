// src/Component/Reports/BranchReports/BranchReportsFilters.jsx
import React from "react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Badge} from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function BranchReportsFilters({
                                                 reportType, setReportType,
                                                 branchId, setBranchId,
                                                 fromDate, setFromDate,
                                                 toDate, setToDate,
                                                 maxToDate,
                                                 loadDisabled, loading,
                                                 onThisMonth,
                                                 onLoad,

                                                 branchesLoading,
                                                 branchOptions,
                                                 branchSelectDisabled,

                                                 showLoanFilters,
                                                 search, setSearch,
                                                 viewMode, setViewMode,
                                                 weekStart, setWeekStart,
                                                 includeCharges, setIncludeCharges,
                                                 includeExpenses, setIncludeExpenses,
                                                 includeOtherLogs, setIncludeOtherLogs,
                                                 includeEmptyDays, setIncludeEmptyDays,
                                             }) {
    return (
        <div className="space-y-4">
            {/* ===================== TOP FILTER ROW ===================== */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

                {/* Report Type */}
                <div className="space-y-2 lg:col-span-3">
                    <Label>Report</Label>
                    <Select
                        value={reportType}
                        onValueChange={(v) => setReportType(v)}
                    >
                        <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select report"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOAN_LEDGER">
                                Cashbook (Loan Ledger)
                            </SelectItem>
                            <SelectItem value="PASSBOOK">
                                Passbook
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Branch */}
                <div className="space-y-2 lg:col-span-5">
                    <Label>Branch</Label>

                    {branchesLoading ? (
                        <Skeleton className="h-10 w-full"/>
                    ) : (
                        <Select
                            value={branchId}
                            onValueChange={(v) => setBranchId(v)}
                            disabled={branchSelectDisabled}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select branch"/>
                            </SelectTrigger>
                            <SelectContent>
                                {branchOptions.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* From Date */}
                <div className="space-y-2 lg:col-span-2">
                    <Label>From</Label>
                    <Input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>

                {/* To Date */}
                <div className="space-y-2 lg:col-span-2">
                    <Label>To</Label>
                    <Input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        max={maxToDate || undefined}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                {/* Buttons */}
                <div className="flex items-end gap-2 lg:col-span-1">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onThisMonth}
                        disabled={loading}
                    >
                        This Month
                    </Button>

                    <Button
                        className="w-full"
                        onClick={onLoad}
                        disabled={loadDisabled || loading}
                    >
                        {loading ? "Loading..." : "Load"}
                    </Button>
                </div>
            </div>

            {/* ===================== LOAN FILTERS ===================== */}
            {showLoanFilters && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

                    {/* Search */}
                    <div className="space-y-2 lg:col-span-4">
                        <Label>Search</Label>
                        <Input
                            placeholder="Narration / Loan / Member / Group"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* View Mode */}
                    <div className="space-y-2 lg:col-span-2">
                        <Label>View</Label>
                        <Select value={viewMode} onValueChange={setViewMode}>
                            <SelectTrigger className="h-10">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAILY">Daily</SelectItem>
                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Week Start */}
                    <div className="space-y-2 lg:col-span-2">
                        <Label>Week Start</Label>
                        <Select
                            value={weekStart}
                            onValueChange={setWeekStart}
                            disabled={viewMode !== "WEEKLY"}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MON">Mon</SelectItem>
                                <SelectItem value="SUN">Sun</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Include Toggles */}
                    <div className="space-y-2 lg:col-span-4">
                        <Label>Include</Label>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant={includeCharges ? "default" : "outline"}
                                onClick={() => setIncludeCharges((s) => !s)}
                            >
                                Charges
                            </Button>

                            <Button
                                type="button"
                                variant={includeExpenses ? "default" : "outline"}
                                onClick={() => setIncludeExpenses((s) => !s)}
                            >
                                Expenses
                            </Button>

                            <Button
                                type="button"
                                variant={includeOtherLogs ? "default" : "outline"}
                                onClick={() => setIncludeOtherLogs((s) => !s)}
                            >
                                Other
                            </Button>

                            <Button
                                type="button"
                                variant={includeEmptyDays ? "default" : "outline"}
                                onClick={() => setIncludeEmptyDays((s) => !s)}
                            >
                                Empty Days
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className="text-xs">
                                Tip: turn off “Empty Days” for faster view
                            </Badge>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
