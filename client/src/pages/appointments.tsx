import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Search, Edit, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format, parseISO, isAfter, setHours, setMinutes, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";

function getModificationDeadline(appointmentDate: string): Date {
  const date = parseISO(appointmentDate);
  const deadline = subDays(date, 1);
  return setMinutes(setHours(deadline, 22), 0);
}

function canModifyAppointment(appointmentDate: string): boolean {
  const deadline = getModificationDeadline(appointmentDate);
  return isAfter(deadline, new Date());
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" data-testid="badge-status-pending">待确认</Badge>;
    case "confirmed":
      return <Badge className="bg-primary/10 text-primary border-primary/20" data-testid="badge-status-confirmed">已确认</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="text-muted-foreground" data-testid="badge-status-cancelled">已取消</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" data-testid="badge-status-completed">已完成</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AppointmentsPage() {
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const { data: appointments, isLoading, error } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/by-email/${encodeURIComponent(searchedEmail)}`],
    enabled: !!searchedEmail,
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/by-email/${encodeURIComponent(searchedEmail)}`] });
      toast({
        title: "预约已取消",
        description: "您的预约已成功取消",
      });
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast({
        title: "取消失败",
        description: error?.message || "取消截止时间已过（咨询前一天22:00前）",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSearchedEmail(email.trim());
    }
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleModifyClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setModifyDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedAppointment) {
      cancelMutation.mutate(selectedAppointment.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">我的预约</h1>
            <p className="text-muted-foreground">
              输入您预约时填写的邮箱地址查询预约记录
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="email" className="sr-only">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email-search"
                  />
                </div>
                <Button type="submit" disabled={!email.trim()} data-testid="button-search">
                  <Search className="mr-2 h-4 w-4" />
                  查询预约
                </Button>
              </form>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <p className="text-muted-foreground">查询失败，请稍后重试</p>
              </CardContent>
            </Card>
          )}

          {searchedEmail && !isLoading && !error && (
            <>
              {appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">
                    查询结果 <span className="text-muted-foreground font-normal">({appointments.length} 条记录)</span>
                  </h2>
                  {appointments.map((appointment) => {
                    const canModify = canModifyAppointment(appointment.appointmentDate);
                    const isActiveAppointment = appointment.status === "pending" || appointment.status === "confirmed";
                    const deadline = getModificationDeadline(appointment.appointmentDate);
                    
                    return (
                      <Card key={appointment.id} data-testid={`card-appointment-${appointment.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                                {appointment.consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                                {getStatusBadge(appointment.status)}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                预约于 {format(new Date(appointment.createdAt!), "yyyy年M月d日 HH:mm", { locale: zhCN })}
                              </CardDescription>
                            </div>
                            {isActiveAppointment && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleModifyClick(appointment)}
                                  disabled={!canModify}
                                  data-testid={`button-modify-${appointment.id}`}
                                >
                                  <Edit className="mr-1 h-4 w-4" />
                                  更改
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelClick(appointment)}
                                  disabled={!canModify}
                                  className={canModify ? "text-destructive hover:text-destructive" : ""}
                                  data-testid={`button-cancel-${appointment.id}`}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  取消
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(parseISO(appointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.appointmentTime}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{appointment.consultationMode === "online" ? "线上咨询" : "线下咨询"}</span>
                            </div>
                            {isActiveAppointment && !canModify && (
                              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md p-2 mt-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs">
                                  更改/取消截止时间已过（{format(deadline, "M月d日 HH:mm", { locale: zhCN })}）
                                </span>
                              </div>
                            )}
                            {isActiveAppointment && canModify && (
                              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs">
                                  可在 {format(deadline, "M月d日 HH:mm", { locale: zhCN })} 前更改或取消
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      未找到与该邮箱关联的预约记录
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      请确认邮箱地址是否正确，或尝试其他邮箱
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消预约</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要取消这次预约吗？此操作无法撤销。
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-muted rounded-md text-foreground">
                  <div className="font-medium">
                    {format(parseISO(selectedAppointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAppointment.appointmentTime} · {selectedAppointment.consultationMode === "online" ? "线上咨询" : "线下咨询"}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">返回</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  取消中...
                </>
              ) : (
                "确认取消"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更改预约</DialogTitle>
            <DialogDescription>
              如需更改预约时间，请取消当前预约后重新预约，或直接联系咨询师。
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">
                当前预约时间
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(parseISO(selectedAppointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
                <br />
                {selectedAppointment.appointmentTime} · {selectedAppointment.consultationMode === "online" ? "线上咨询" : "线下咨询"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)} data-testid="button-modify-dialog-close">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
