import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useToast} from "@/hooks/use-toast";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const {login} = useAuth();
    const navigate = useNavigate();
    const {toast} = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);

        if (success) {
            toast({title: "Login successful"});
            navigate("/dashboard");
        } else {
            toast({
                title: "Login failed",
                description: "Invalid credentials",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Micro Finance System</CardTitle>
                    <CardDescription>Login to access your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@mf.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </form>

                    <div className="mt-4 text-sm text-muted-foreground">
                        <p>Demo: admin@mf.com (any password)</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
