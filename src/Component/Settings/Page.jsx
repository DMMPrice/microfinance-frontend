// src/Component/Settings/Page.jsx
import React from "react";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";

import SystemSettingsSection from "@/Component/Settings/SystemSettingsSection.jsx";
import ExpenseMasterSection from "@/Component/Settings/ExpenseMasterSection.jsx";
import DatabaseMaintenanceSection from "@/Component/Settings/DatabaseMaintenanceSection.jsx";

export default function SettingsPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">System Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage system-level behavior such as loan rules and closure constraints.
                </p>
            </div>

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settings">System Settings</TabsTrigger>
                    <TabsTrigger value="expenseMaster">Expense Categories Settings</TabsTrigger>
                    <TabsTrigger value="db">DB Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    <SystemSettingsSection/>
                </TabsContent>

                <TabsContent value="expenseMaster" className="space-y-6">
                    <ExpenseMasterSection/>
                </TabsContent>

                <TabsContent value="db" className="space-y-6">
                    <DatabaseMaintenanceSection/>
                </TabsContent>
            </Tabs>
        </div>
    );
}
