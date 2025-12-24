// src/Component/Login.jsx
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext.jsx";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {useToast} from "@/hooks/use-toast";
import {logo} from "@/assets/logo.svg";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const {login} = useAuth();
    const navigate = useNavigate();
    const {toast} = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);

        if (success) {
            toast({title: "Login successful"});
            navigate("/dashboard");
        } else {
            toast({
                title: "Login failed",
                description: "Invalid username or password",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-4 text-center">
                    {/* ✅ Logo */}
                    <div className="flex justify-center">
                        <img
                            src={logo}
                            alt="Akota Welfare Society Logo"
                            className="h-16 w-auto"
                        />
                    </div>

                    {/* ✅ Organization Name */}
                    <CardTitle className="text-2xl font-bold">
                        Akota Welfare Society
                    </CardTitle>

                    <CardDescription>
                        Login to access your dashboard
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin@aws.org"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
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
                </CardContent>
            </Card>
        </div>
    );
}
