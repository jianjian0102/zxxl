import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, Search, User, Phone, Mail, MoreVertical, Loader2, ChevronLeft, Eye, Settings, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Appointment } from "@shared/schema";

const STATUS_OPTIONS = [
    { value: "all", label: "全部状态" },
    { value: "pending", label: "待确认" },
    { value: "pending_payment", label: "待付款" },
    { value: "confirmed", label: "待咨询" },
    { value: "completed", label: "已结束" },
    { value: "cancelled", label: "已取消" },
];

const STATUS_LABELS: Record<string, string> = {
    pending: "待确认",
    pending_payment: "待付款",
    confirmed: "待咨询",
    completed: "已结束",
    cancelled: "已取消",
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "pending":
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">待确认</Badge>;
        case "pending_payment":
            return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">待付款</Badge>;
        case "confirmed":
            return <Badge className="bg-primary/10 text-primary border-primary/20">待咨询</Badge>;
        case "completed":
            return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">已结束</Badge>;
        case "cancelled":
            return <Badge variant="outline" className="text-muted-foreground">已取消</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

export default function AppointmentManager() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
        queryKey: ["/api/appointments"],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            toast({ title: "成功", description: "预约状态已更新" });
        },
        onError: () => {
            toast({ title: "错误", description: "更新状态失败", variant: "destructive" });
        },
    });

    const initiateChatMutation = useMutation({
        mutationFn: async (appointment: Appointment) => {
            return apiRequest("POST", "/api/admin/conversations/initiate", {
                visitorEmail: appointment.contactEmail,
                visitorName: appointment.name,
            });
        },
        onSuccess: () => {
            toast({ title: "成功", description: "已发起对话，请前往消息中心查看" });
            setLocation("/admin/messages");
        },
        onError: (error: any) => {
            toast({ title: "错误", description: error.message || "发起对话失败", variant: "destructive" });
        },
    });

    const filteredAppointments = appointments
        .filter((apt) => {
            if (statusFilter !== "all" && apt.status !== statusFilter) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    apt.name.toLowerCase().includes(term) ||
                    apt.contactPhone.includes(term) ||
                    (apt.contactEmail && apt.contactEmail.toLowerCase().includes(term))
                );
            }
            return true;
        })
        .sort((a, b) => {
            // Sort by date/time descending (newest first)
            const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
            const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
            return dateB.getTime() - dateA.getTime();
        });

    const handleUpdateStatus = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status });
    };

    const handleViewDetail = (appointment: Appointment) => {
        setLocation(`/appointments/${appointment.id}`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>预约列表</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索姓名、电话..."
                                    className="pl-9 w-full sm:w-[200px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    data-testid="input-search-appointments"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="状态筛选" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed">
                            <div className="flex justify-center mb-3">
                                <Calendar className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <p>暂无符合条件的预约</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAppointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-4"
                                    data-testid={`appointment-${appointment.id}`}
                                >
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-start justify-between lg:justify-start lg:gap-3">
                                            <div className="font-semibold text-lg flex items-center gap-2">
                                                {appointment.name}
                                                {getStatusBadge(appointment.status)}
                                            </div>
                                            <Badge variant="outline" className="lg:hidden">
                                                {appointment.consultationType === "regular" ? "一般咨询" : "公益咨询"}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-6 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(appointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                {appointment.appointmentTime}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                {appointment.consultationMode === "online" ? "线上咨询" : "线下咨询"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                {appointment.contactPhone}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 mt-2 lg:mt-0">
                                        <div className="hidden lg:block lg:mr-4">
                                            <Badge variant="outline">
                                                {appointment.consultationType === "regular" ? "一般咨询" : "公益咨询"}
                                            </Badge>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" data-testid={`button-status-${appointment.id}`}>
                                                    <MoreVertical className="h-4 w-4 mr-1 sm:hidden" />
                                                    <span className="hidden sm:inline">更新状态</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                    <DropdownMenuItem
                                                        key={value}
                                                        onClick={() => handleUpdateStatus(appointment.id, value)}
                                                        disabled={appointment.status === value}
                                                    >
                                                        标记为 {label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appointment.contactEmail && initiateChatMutation.mutate(appointment)}
                                            disabled={!appointment.contactEmail}
                                            title={!appointment.contactEmail ? "无联系邮箱" : "发起对话"}
                                        >
                                            <MessageCircle className="h-4 w-4 mr-1" />
                                            对话
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewDetail(appointment)}
                                            data-testid={`button-view-${appointment.id}`}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            详情
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
