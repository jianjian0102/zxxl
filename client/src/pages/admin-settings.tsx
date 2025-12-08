import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Plus, Trash2, CalendarX, Settings, Megaphone, MessageSquare, LogOut, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ScheduleSetting, BlockedDate } from "@shared/schema";
import AnnouncementList from "@/components/AnnouncementList";
import MessageCenter from "@/components/MessageCenter";

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function AdminSettingsPage() {
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
  const [newSlotDay, setNewSlotDay] = useState(1);
  const [newSlotTime, setNewSlotTime] = useState("10:00");
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");

  const { data: scheduleSettings = [], isLoading: loadingSettings } = useQuery<ScheduleSetting[]>({
    queryKey: ["/api/schedule-settings"],
  });

  const { data: blockedDates = [], isLoading: loadingBlocked } = useQuery<BlockedDate[]>({
    queryKey: ["/api/blocked-dates"],
  });

  const createSettingMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; timeSlot: string }) => {
      return apiRequest("POST", "/api/schedule-settings", {
        dayOfWeek: data.dayOfWeek,
        timeSlot: data.timeSlot,
        isOnlineAvailable: true,
        isOfflineAvailable: true,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-settings"] });
      toast({ title: "成功", description: "已添加新时段" });
    },
    onError: () => {
      toast({ title: "错误", description: "添加时段失败", variant: "destructive" });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduleSetting> }) => {
      return apiRequest("PATCH", `/api/schedule-settings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-settings"] });
      toast({ title: "成功", description: "已更新时段设置" });
    },
    onError: () => {
      toast({ title: "错误", description: "更新时段失败", variant: "destructive" });
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedule-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-settings"] });
      toast({ title: "成功", description: "已删除时段" });
    },
    onError: () => {
      toast({ title: "错误", description: "删除时段失败", variant: "destructive" });
    },
  });

  const createBlockedDateMutation = useMutation({
    mutationFn: async (data: { date: string; reason?: string }) => {
      return apiRequest("POST", "/api/blocked-dates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      setNewBlockedDate("");
      setNewBlockedReason("");
      toast({ title: "成功", description: "已添加不可预约日期" });
    },
    onError: () => {
      toast({ title: "错误", description: "添加日期失败", variant: "destructive" });
    },
  });

  const deleteBlockedDateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/blocked-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      toast({ title: "成功", description: "已删除不可预约日期" });
    },
    onError: () => {
      toast({ title: "错误", description: "删除日期失败", variant: "destructive" });
    },
  });

  const groupedSettings = scheduleSettings.reduce((acc, setting) => {
    const day = setting.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(setting);
    return acc;
  }, {} as Record<number, ScheduleSetting[]>);

  const handleAddSlot = () => {
    const existing = scheduleSettings.find(
      (s) => s.dayOfWeek === newSlotDay && s.timeSlot === newSlotTime
    );
    if (existing) {
      toast({ title: "错误", description: "该时段已存在", variant: "destructive" });
      return;
    }
    createSettingMutation.mutate({ dayOfWeek: newSlotDay, timeSlot: newSlotTime });
  };

  const handleAddBlockedDate = () => {
    if (!newBlockedDate) {
      toast({ title: "错误", description: "请选择日期", variant: "destructive" });
      return;
    }
    createBlockedDateMutation.mutate({ date: newBlockedDate, reason: newBlockedReason || undefined });
  };

  if (authLoading || loadingSettings || loadingBlocked) {
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
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">管理中心</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/appointments">
              <Button variant="outline" data-testid="button-appointments">
                <ClipboardList className="w-4 h-4 mr-2" />
                预约管理
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? "登出中..." : "登出"}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          管理咨询时间、公告和留言
        </p>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="schedule" className="gap-2" data-testid="tab-schedule">
            <Clock className="w-4 h-4" />
            咨询时间
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2" data-testid="tab-blocked">
            <CalendarX className="w-4 h-4" />
            不可预约日期
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2" data-testid="tab-announcements">
            <Megaphone className="w-4 h-4" />
            公告管理
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4" />
            留言管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                添加新时段
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>星期</Label>
                  <select
                    value={newSlotDay}
                    onChange={(e) => setNewSlotDay(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="select-day"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <option key={day} value={day}>
                        {DAY_NAMES[day]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>时间</Label>
                  <Input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-32"
                    data-testid="input-time"
                  />
                </div>
                <Button
                  onClick={handleAddSlot}
                  disabled={createSettingMutation.isPending}
                  data-testid="button-add-slot"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <Card key={day}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-4 h-4" />
                    {DAY_NAMES[day]}
                    <Badge variant="secondary">
                      {groupedSettings[day]?.filter((s) => s.isActive).length || 0} 个时段
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedSettings[day]?.length ? (
                    groupedSettings[day]
                      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                      .map((setting) => (
                        <div
                          key={setting.id}
                          className={`p-3 rounded-md border ${
                            setting.isActive
                              ? "bg-card"
                              : "bg-muted/50 opacity-60"
                          }`}
                          data-testid={`slot-${setting.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{setting.timeSlot}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSettingMutation.mutate(setting.id)}
                              disabled={deleteSettingMutation.isPending}
                              data-testid={`button-delete-${setting.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <Label className="text-muted-foreground">启用</Label>
                              <Switch
                                checked={setting.isActive}
                                onCheckedChange={(checked) =>
                                  updateSettingMutation.mutate({
                                    id: setting.id,
                                    data: { isActive: checked },
                                  })
                                }
                                data-testid={`switch-active-${setting.id}`}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-muted-foreground">线上咨询</Label>
                              <Switch
                                checked={setting.isOnlineAvailable}
                                onCheckedChange={(checked) =>
                                  updateSettingMutation.mutate({
                                    id: setting.id,
                                    data: { isOnlineAvailable: checked },
                                  })
                                }
                                data-testid={`switch-online-${setting.id}`}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-muted-foreground">线下咨询</Label>
                              <Switch
                                checked={setting.isOfflineAvailable}
                                onCheckedChange={(checked) =>
                                  updateSettingMutation.mutate({
                                    id: setting.id,
                                    data: { isOfflineAvailable: checked },
                                  })
                                }
                                data-testid={`switch-offline-${setting.id}`}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      暂无时段
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="blocked" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarX className="w-5 h-5" />
                添加不可预约日期
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="w-40"
                    data-testid="input-blocked-date"
                  />
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>原因（可选）</Label>
                  <Input
                    placeholder="如：节假日、出差等"
                    value={newBlockedReason}
                    onChange={(e) => setNewBlockedReason(e.target.value)}
                    data-testid="input-blocked-reason"
                  />
                </div>
                <Button
                  onClick={handleAddBlockedDate}
                  disabled={createBlockedDateMutation.isPending}
                  data-testid="button-add-blocked"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>不可预约日期列表</CardTitle>
            </CardHeader>
            <CardContent>
              {blockedDates.length ? (
                <div className="space-y-2">
                  {blockedDates.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="flex items-center justify-between p-3 rounded-md border bg-card"
                      data-testid={`blocked-${blocked.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarX className="w-4 h-4 text-destructive" />
                        <span className="font-medium">
                          {format(new Date(blocked.date), "yyyy年M月d日 EEEE", {
                            locale: zhCN,
                          })}
                        </span>
                        {blocked.reason && (
                          <Badge variant="secondary">
                            {blocked.reason}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlockedDateMutation.mutate(blocked.id)}
                        disabled={deleteBlockedDateMutation.isPending}
                        data-testid={`button-delete-blocked-${blocked.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无不可预约日期
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">公告管理</h2>
            <p className="text-muted-foreground text-sm">
              发布和管理咨询师公告，来访者可以在公告栏页面查看
            </p>
          </div>
          <AnnouncementList isAdmin={true} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">留言管理</h2>
            <p className="text-muted-foreground text-sm">
              查看和回复来访者留言
            </p>
          </div>
          <MessageCenter isAdmin={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
