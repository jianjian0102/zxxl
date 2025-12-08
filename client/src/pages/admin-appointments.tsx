import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, Search, User, Phone, Mail, MoreVertical, Loader2, ChevronLeft, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Appointment } from "@shared/schema";
import { Link } from "wouter";

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待确认" },
  { value: "pending_payment", label: "待付款" },
  { value: "confirmed", label: "已确认" },
  { value: "completed", label: "咨询结束" },
  { value: "cancelled", label: "已取消" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "待确认",
  pending_payment: "待付款",
  confirmed: "已确认",
  completed: "咨询结束",
  cancelled: "已取消",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">待确认</Badge>;
    case "pending_payment":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">待付款</Badge>;
    case "confirmed":
      return <Badge className="bg-primary/10 text-primary border-primary/20">已确认</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">咨询结束</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground">已取消</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminAppointmentsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: authData, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/me"],
  });

  useEffect(() => {
    if (!authLoading && !authData?.isAdmin) {
      setLocation("/admin/login");
    }
  }, [authLoading, authData, setLocation]);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: !!authData?.isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "成功", description: "已更新预约状态" });
    },
    onError: () => {
      toast({ title: "错误", description: "更新状态失败", variant: "destructive" });
    },
  });

  const filteredAppointments = appointments
    .filter((apt) => {
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          apt.name.toLowerCase().includes(term) ||
          apt.contactEmail?.toLowerCase().includes(term) ||
          apt.contactPhone.includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateB.getTime() - dateA.getTime();
    });

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: appointmentId, status: newStatus });
  };

  const handleViewDetail = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authData?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">预约管理</h1>
          </div>
          <Link href="/admin/settings">
            <Button variant="outline" size="sm" data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              系统设置
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、邮箱或电话..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue />
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">暂无预约记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                共 {filteredAppointments.length} 条记录
              </p>
              {filteredAppointments.map((appointment) => (
                <Card key={appointment.id} data-testid={`card-appointment-${appointment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{appointment.name}</span>
                          {getStatusBadge(appointment.status)}
                          <Badge variant="outline" className="text-xs">
                            {appointment.consultationType === "regular" ? "一般咨询" : "公益低价"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {appointment.consultationMode === "online" ? "线上" : "线下"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(appointment.appointmentDate), "M月d日 EEEE", { locale: zhCN })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {appointment.appointmentTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {appointment.contactPhone}
                          </span>
                          {appointment.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {appointment.contactEmail}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(appointment)}
                          data-testid={`button-view-${appointment.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          详情
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-status-menu-${appointment.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {["pending", "pending_payment", "confirmed", "completed", "cancelled"].map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleStatusChange(appointment.id, status)}
                                disabled={appointment.status === status}
                                data-testid={`menu-status-${status}`}
                              >
                                设为{STATUS_LABELS[status]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>预约详情</DialogTitle>
            <DialogDescription>
              查看来访者完整信息
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-lg">{selectedAppointment.name}</span>
                {getStatusBadge(selectedAppointment.status)}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">预约信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(parseISO(selectedAppointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedAppointment.appointmentTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedAppointment.consultationMode === "online" ? "线上咨询" : "线下咨询"}</span>
                    </div>
                    <div>
                      <Badge variant="outline">
                        {selectedAppointment.consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">联系方式</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedAppointment.contactPhone}</span>
                    </div>
                    {selectedAppointment.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedAppointment.contactEmail}</span>
                      </div>
                    )}
                    {selectedAppointment.emergencyContact && (
                      <div>
                        <span className="text-muted-foreground">紧急联系人：</span>
                        {selectedAppointment.emergencyContact}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">个人信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">性别：</span>
                      {selectedAppointment.gender === "male" ? "男" : selectedAppointment.gender === "female" ? "女" : "其他"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">出生日期：</span>
                      {selectedAppointment.birthDate}
                    </div>
                    {selectedAppointment.occupation && (
                      <div>
                        <span className="text-muted-foreground">职业：</span>
                        {selectedAppointment.occupation}
                      </div>
                    )}
                    {selectedAppointment.hobbies && (
                      <div>
                        <span className="text-muted-foreground">兴趣爱好：</span>
                        {selectedAppointment.hobbies}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">咨询历史</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">既往咨询经历：</span>
                    {selectedAppointment.hasPreviousCounseling ? "有" : "无"}
                    {selectedAppointment.previousCounselingDetails && (
                      <p className="mt-1 text-muted-foreground">{selectedAppointment.previousCounselingDetails}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">精神疾病诊断：</span>
                    {selectedAppointment.hasMentalDiagnosis ? "有" : "无"}
                    {selectedAppointment.mentalDiagnosisDetails && (
                      <p className="mt-1 text-muted-foreground">{selectedAppointment.mentalDiagnosisDetails}</p>
                    )}
                  </div>
                  {selectedAppointment.currentMedication && (
                    <div>
                      <span className="text-muted-foreground">正在服用药物：</span>
                      {selectedAppointment.currentMedication}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">咨询主题</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedAppointment.consultationTopics && selectedAppointment.consultationTopics.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {selectedAppointment.consultationTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">情况描述：</span>
                    <p className="mt-1 whitespace-pre-wrap">{selectedAppointment.situationDescription}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">更改状态：</span>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(value) => {
                    handleStatusChange(selectedAppointment.id, value);
                    setSelectedAppointment({ ...selectedAppointment, status: value as any });
                  }}
                >
                  <SelectTrigger className="w-[140px]" data-testid="select-detail-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["pending", "pending_payment", "confirmed", "completed", "cancelled"].map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} data-testid="button-close-detail">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
