import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { Calendar, Clock, MapPin, Search, Edit, X, AlertCircle, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { format, parseISO, isAfter, setHours, setMinutes, subDays, addDays, isBefore, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";

interface AvailableSlot {
  time: string;
  isOnlineAvailable: boolean;
  isOfflineAvailable: boolean;
  isBooked: boolean;
}

interface ScheduleResponse {
  slots: AvailableSlot[];
  isBlocked: boolean;
}

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
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState<string | null>(null);
  const { toast } = useToast();

  const dateString = newDate ? format(newDate, "yyyy-MM-dd") : null;

  const { data: scheduleData, isLoading: loadingSlots } = useQuery<ScheduleResponse>({
    queryKey: ["/api/schedule/available", dateString],
    enabled: !!dateString && modifyDialogOpen,
  });

  useEffect(() => {
    if (modifyDialogOpen && selectedAppointment) {
      const currentDate = parseISO(selectedAppointment.appointmentDate);
      setNewDate(currentDate);
      setNewTime(selectedAppointment.appointmentTime.slice(0, 5));
    } else {
      setNewDate(undefined);
      setNewTime(null);
    }
  }, [modifyDialogOpen, selectedAppointment]);

  const getAvailableSlots = () => {
    if (!newDate || !scheduleData || !selectedAppointment) return [];
    if (scheduleData.isBlocked) return [];
    
    const consultationMode = selectedAppointment.consultationMode;
    const currentDateStr = format(newDate, "yyyy-MM-dd");
    const isCurrentAppointmentDate = currentDateStr === selectedAppointment.appointmentDate;
    const currentAppointmentTime = selectedAppointment.appointmentTime.slice(0, 5);
    
    return scheduleData.slots
      .filter((slot) => {
        if (consultationMode === "online") return slot.isOnlineAvailable;
        if (consultationMode === "offline") return slot.isOfflineAvailable;
        return false;
      })
      .map((slot) => {
        const isCurrentSlot = isCurrentAppointmentDate && slot.time === currentAppointmentTime;
        return {
          time: slot.time,
          available: !slot.isBooked || isCurrentSlot,
          isCurrentSlot,
        };
      });
  };

  const timeSlots = getAvailableSlots();

  const { data: appointments, isLoading, error } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/by-email/${encodeURIComponent(searchedEmail)}`],
    enabled: !!searchedEmail,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ appointmentId, email }: { appointmentId: string; email: string }) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/cancel`, {
        verifyEmail: email,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/by-email/${encodeURIComponent(searchedEmail)}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/available"] });
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

  const modifyMutation = useMutation({
    mutationFn: async ({ appointmentId, email, appointmentDate, appointmentTime }: { 
      appointmentId: string; 
      email: string; 
      appointmentDate: string;
      appointmentTime: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        verifyEmail: email,
        appointmentDate,
        appointmentTime,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/by-email/${encodeURIComponent(searchedEmail)}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/available"] });
      toast({
        title: "预约已更改",
        description: "您的预约时间已成功更新",
      });
      setModifyDialogOpen(false);
      setSelectedAppointment(null);
      setNewDate(undefined);
      setNewTime(null);
    },
    onError: (error: any) => {
      toast({
        title: "更改失败",
        description: error?.message || "更改预约时间失败",
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
      cancelMutation.mutate({ 
        appointmentId: selectedAppointment.id, 
        email: searchedEmail 
      });
    }
  };

  const confirmModify = () => {
    if (selectedAppointment && newDate && newTime) {
      modifyMutation.mutate({
        appointmentId: selectedAppointment.id,
        email: searchedEmail,
        appointmentDate: format(newDate, "yyyy-MM-dd"),
        appointmentTime: newTime,
      });
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    return isBefore(date, addDays(today, 1));
  };

  const hasChanges = () => {
    if (!selectedAppointment || !newDate || !newTime) return false;
    const newDateStr = format(newDate, "yyyy-MM-dd");
    const currentTime = selectedAppointment.appointmentTime.slice(0, 5);
    return newDateStr !== selectedAppointment.appointmentDate || newTime !== currentTime;
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>更改预约时间</DialogTitle>
            <DialogDescription>
              选择新的日期和时间，无需重新填写申请表
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground mb-1">当前预约</div>
                <div className="font-medium">
                  {format(parseISO(selectedAppointment.appointmentDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
                  {" · "}
                  {selectedAppointment.appointmentTime}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedAppointment.consultationType === "regular" ? "一般咨询" : "公益低价咨询"} · {selectedAppointment.consultationMode === "online" ? "线上" : "线下"}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>如需更改咨询方式（线上/线下）或咨询类型（一般/公益），请取消当前预约后重新申请</span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">选择新日期</Label>
                  <div className="border rounded-md p-2">
                    <CalendarComponent
                      mode="single"
                      selected={newDate}
                      onSelect={(date) => {
                        setNewDate(date);
                        setNewTime(null);
                      }}
                      disabled={isDateDisabled}
                      locale={zhCN}
                      className="rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">选择新时间</Label>
                  <div className="border rounded-md p-3 min-h-[200px]">
                    {!newDate ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        请先选择日期
                      </div>
                    ) : loadingSlots ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={newTime === slot.time ? "default" : "outline"}
                            size="sm"
                            disabled={!slot.available}
                            onClick={() => setNewTime(slot.time)}
                            className="h-10"
                            data-testid={`button-time-${slot.time}`}
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {slot.time}
                            {!slot.available && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                已约
                              </Badge>
                            )}
                            {slot.isCurrentSlot && slot.available && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                当前
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {scheduleData?.isBlocked ? "当日不开放预约" : "当日无可用时间段"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {newDate && newTime && hasChanges() && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="text-sm text-muted-foreground mb-1">更改后</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-muted-foreground text-sm">
                      {format(parseISO(selectedAppointment.appointmentDate), "M月d日", { locale: zhCN })} {selectedAppointment.appointmentTime.slice(0, 5)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-primary">
                      {format(newDate, "M月d日 EEEE", { locale: zhCN })} {newTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setModifyDialogOpen(false)} 
              data-testid="button-modify-dialog-close"
            >
              取消
            </Button>
            <Button 
              onClick={confirmModify}
              disabled={!hasChanges() || modifyMutation.isPending}
              data-testid="button-modify-dialog-confirm"
            >
              {modifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更改中...
                </>
              ) : (
                "确认更改"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
