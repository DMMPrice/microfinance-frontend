// src/App.jsx
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {HashRouter, Routes, Route, Navigate} from "react-router-dom";

import {AuthProvider, useAuth} from "@/contexts/AuthContext";
import {initializeStorage} from "@/lib/storage";

import Login from "./Component/Login.jsx";
import Home from "./Component/Home.jsx";
import Index from "@/Component/Index.jsx";
import NotFound from "./Utils/NotFound.jsx";

const queryClient = new QueryClient();

// Initialize any localStorage defaults, etc.
initializeStorage();

function ProtectedRoute({children}) {
    const {isAuthenticated, isLoading} = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }

    return <>{children}</>;
}

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster/>
                <Sonner/>

                {/* ✅ HashRouter fixes Electron file:// path routing issues */}
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<Index/>}/>
                        <Route path="/login" element={<Login/>}/>
                        <Route
                            path="/dashboard/*"
                            element={
                                <ProtectedRoute>
                                    <Home/>
                                </ProtectedRoute>
                            }
                        />

                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound/>}/>
                    </Routes>
                </HashRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
