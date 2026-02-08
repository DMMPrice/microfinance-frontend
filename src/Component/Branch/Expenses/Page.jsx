// src/Component/Branches/Expenses/Page.jsx
import React from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

import ExpensesTab from "./ExpensesTab.jsx";
import OpeningBalanceTab from "./OpeningBalanceTab.jsx";

export default function Page() {
    return (
        <div className="space-y-4">
            <Tabs defaultValue="expenses" className="w-full">
                <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="opening_balance">Opening Balance</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="mt-4">
                    <ExpensesTab />
                </TabsContent>

                <TabsContent value="opening_balance" className="mt-4">
                    <OpeningBalanceTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
