import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MessageCenter from "@/components/MessageCenter";
import { useEffect } from "react";

export default function AdminMessagesPage() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const { data: authData, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
        queryKey: ["/api/admin/me"],
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            return apiRequest("POST", "/api/admin/logout");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
            toast({ title: "已登出" });
            setLocation("/admin/login");
        },
        onError: () => {
            toast({ title: "登出失败", variant: "destructive" });
        },
    });

    useEffect(() => {
        if (!authLoading && !authData?.isAdmin) {
            setLocation("/admin/login");
        }
    }, [authLoading, authData, setLocation]);

    if (authLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-muted-foreground">加载中...</div>
                </div>
            </div>
        );
    }

    if (!authData?.isAdmin) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/settings">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <MessageSquare className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold">留言管理</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => logoutMutation.mutate()}
                            disabled={logoutMutation.isPending}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {logoutMutation.isPending ? "登出中..." : "登出"}
                        </Button>
                    </div>
                </div>
                <p className="text-muted-foreground ml-12">
                    查看和回复来访者留言
                </p>
            </div>

            <MessageCenter isAdmin={true} />
        </div>
    );
}
