// src/Component/Settings/DatabaseMaintenanceSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Separator} from "@/components/ui/separator";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";

import {Loader2, Database, Download, Upload, Copy, Eye, EyeOff} from "lucide-react";
import {toast} from "@/components/ui/use-toast";

import {useDbMaintenance} from "@/hooks/useDbMaintenance";

export default function DatabaseMaintenanceSection() {
    const {backup, restore, cloneTo, isBackingUp, isRestoring, isCloning} = useDbMaintenance();

    // -------------------------
    // RESTORE: creds + file
    // -------------------------
    const [restoreFile, setRestoreFile] = useState(null);

    const [restoreHost, setRestoreHost] = useState("127.0.0.1");
    const [restorePort, setRestorePort] = useState(5432);
    const [restoreDb, setRestoreDb] = useState("microfinance");
    const [restoreUser, setRestoreUser] = useState("postgres");
    const [restorePass, setRestorePass] = useState("");
    const [showRestorePass, setShowRestorePass] = useState(false);

    // -------------------------
    // CLONE-TO form
    // -------------------------
    const [destHost, setDestHost] = useState("127.0.0.1");
    const [destPort, setDestPort] = useState(5432);
    const [destDb, setDestDb] = useState("microfinance_clone");
    const [destUser, setDestUser] = useState("postgres");
    const [destPass, setDestPass] = useState("");
    const [clean, setClean] = useState(false);

    // ✅ show/hide destination password
    const [showDestPass, setShowDestPass] = useState(false);

    const clonePayload = useMemo(
        () => ({
            dest_host: destHost?.trim(),
            dest_port: Number(destPort) || 5432,
            dest_dbname: destDb?.trim(),
            dest_user: destUser?.trim(),
            dest_pass: destPass,
            clean: Boolean(clean),
        }),
        [destHost, destPort, destDb, destUser, destPass, clean]
    );

    const handleBackup = async () => {
        try {
            const {filename} = await backup();
            toast({title: "Backup downloaded", description: `Saved as ${filename}`});
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Backup failed",
                description:
                    e?.response?.data?.detail?.message ||
                    e?.response?.data?.detail ||
                    e?.message ||
                    "Something went wrong",
            });
        }
    };

    const handleRestore = async () => {
        try {
            if (!restoreFile) {
                toast({
                    variant: "destructive",
                    title: "Missing file",
                    description: "Please select a .sql file to restore.",
                });
                return;
            }

            // basic validation
            if (!restoreHost?.trim() || !restoreDb?.trim() || !restoreUser?.trim() || !restorePass) {
                toast({
                    variant: "destructive",
                    title: "Missing fields",
                    description: "Restore Host/DB/User/Password are required.",
                });
                return;
            }

            const res = await restore({
                file: restoreFile,
                creds: {
                    db_host: restoreHost?.trim(),
                    db_port: Number(restorePort) || 5432,
                    db_name: restoreDb?.trim(),
                    db_user: restoreUser?.trim(),
                    db_pass: restorePass, // don't trim passwords
                },
            });

            toast({
                title: "Restore completed",
                description: `Target DB: ${res?.target?.db || restoreDb?.trim() || "unknown"}`,
            });

            setRestoreFile(null);
            // optional: clear password after success
            // setRestorePass("");
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Restore failed",
                description:
                    e?.response?.data?.detail?.message ||
                    e?.response?.data?.detail?.stderr ||
                    e?.response?.data?.detail ||
                    e?.message ||
                    "Something went wrong",
            });
        }
    };

    const handleClone = async () => {
        try {
            // basic validation
            if (!clonePayload.dest_host || !clonePayload.dest_dbname || !clonePayload.dest_user || !clonePayload.dest_pass) {
                toast({
                    variant: "destructive",
                    title: "Missing fields",
                    description: "Destination Host/DB/User/Password are required.",
                });
                return;
            }

            const res = await cloneTo(clonePayload);
            toast({
                title: "Clone completed",
                description: `Destination DB: ${res?.destination?.db || clonePayload.dest_dbname}`,
            });
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Clone failed",
                description:
                    e?.response?.data?.detail?.message ||
                    e?.response?.data?.detail?.stderr ||
                    e?.response?.data?.detail ||
                    e?.message ||
                    "Something went wrong",
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* BACKUP */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5"/>
                        Database Backup
                    </CardTitle>
                    <CardDescription>
                        Download a full SQL backup of the configured database. (Super Admin only)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertTitle>Note</AlertTitle>
                        <AlertDescription>
                            This uses <code>pg_dump</code> and downloads a <code>.sql</code> file. Store it securely.
                        </AlertDescription>
                    </Alert>

                    <Button onClick={handleBackup} disabled={isBackingUp}>
                        {isBackingUp ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Downloading…
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4"/>
                                Download Backup (.sql)
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* RESTORE */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5"/>
                        Restore From SQL
                    </CardTitle>
                    <CardDescription>
                        Upload a .sql file and restore into a target database using the credentials provided below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            Restoring may overwrite existing objects/data depending on the SQL contents. Use carefully.
                        </AlertDescription>
                    </Alert>

                    {/* ✅ Restore Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Host</Label>
                            <Input
                                value={restoreHost}
                                onChange={(e) => setRestoreHost(e.target.value)}
                                placeholder="127.0.0.1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Port</Label>
                            <Input
                                type="number"
                                value={restorePort}
                                onChange={(e) => setRestorePort(e.target.value)}
                                placeholder="5432"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Database Name</Label>
                            <Input
                                value={restoreDb}
                                onChange={(e) => setRestoreDb(e.target.value)}
                                placeholder="microfinance"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>User</Label>
                            <Input
                                value={restoreUser}
                                onChange={(e) => setRestoreUser(e.target.value)}
                                placeholder="akota"
                            />
                        </div>

                        {/* ✅ Password with Eye toggle */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>Password</Label>
                            <div className="relative">
                                <Input
                                    type={showRestorePass ? "text" : "password"}
                                    value={restorePass}
                                    onChange={(e) => setRestorePass(e.target.value)}
                                    placeholder="••••••••"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowRestorePass((v) => !v)}
                                    aria-label={showRestorePass ? "Hide password" : "Show password"}
                                    title={showRestorePass ? "Hide password" : "Show password"}
                                >
                                    {showRestorePass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ✅ SQL file */}
                    <div className="space-y-2">
                        <Label>Upload .sql file</Label>
                        <Input
                            type="file"
                            accept=".sql"
                            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                        />
                        {restoreFile ? (
                            <p className="text-xs text-muted-foreground">Selected: {restoreFile.name}</p>
                        ) : null}
                    </div>

                    <Button onClick={handleRestore} disabled={!restoreFile || isRestoring}>
                        {isRestoring ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Restoring…
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4"/>
                                Restore Database
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* CLONE-TO */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5"/>
                        Clone To Another Database
                    </CardTitle>
                    <CardDescription>
                        Clone SOURCE database into a destination DB.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Destination Host</Label>
                            <Input
                                value={destHost}
                                onChange={(e) => setDestHost(e.target.value)}
                                placeholder="127.0.0.1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Destination Port</Label>
                            <Input
                                type="number"
                                value={destPort}
                                onChange={(e) => setDestPort(e.target.value)}
                                placeholder="5432"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Destination Database Name</Label>
                            <Input
                                value={destDb}
                                onChange={(e) => setDestDb(e.target.value)}
                                placeholder="microfinance_clone"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Destination User</Label>
                            <Input
                                value={destUser}
                                onChange={(e) => setDestUser(e.target.value)}
                                placeholder="postgres"
                            />
                        </div>

                        {/* ✅ Password with Eye toggle */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>Destination Password</Label>

                            <div className="relative">
                                <Input
                                    type={showDestPass ? "text" : "password"}
                                    value={destPass}
                                    onChange={(e) => setDestPass(e.target.value)}
                                    placeholder="••••••••"
                                    className="pr-10"
                                />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowDestPass((v) => !v)}
                                    aria-label={showDestPass ? "Hide password" : "Show password"}
                                    title={showDestPass ? "Hide password" : "Show password"}
                                >
                                    {showDestPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
                            <div>
                                <Label className="block">Clean overwrite</Label>
                                <p className="text-xs text-muted-foreground">
                                    If enabled, dump includes <code>--clean --if-exists</code> and replaces destination
                                    objects.
                                </p>
                            </div>
                            <Switch checked={clean} onCheckedChange={setClean}/>
                        </div>
                    </div>

                    <Separator/>

                    <Button onClick={handleClone} disabled={isCloning}>
                        {isCloning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Cloning…
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4"/>
                                Clone Now
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
