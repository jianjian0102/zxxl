import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Video, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";

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

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingCalendarProps {
  consultationType: "regular" | "welfare";
  consultationMode: "online" | "offline";
  onSelectSlot: (date: Date, time: string) => void;
}

export default function BookingCalendar({ consultationType, consultationMode, onSelectSlot }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { data: scheduleData, isLoading } = useQuery<ScheduleResponse>({
    queryKey: ["/api/schedule/available", dateString],
    enabled: !!dateString,
  });

  const getAvailableSlots = (): TimeSlot[] => {
    if (!selectedDate || !scheduleData) return [];
    if (scheduleData.isBlocked) return [];
    
    return scheduleData.slots
      .filter((slot) => {
        if (consultationMode === "online") return slot.isOnlineAvailable && !slot.isBooked;
        if (consultationMode === "offline") return slot.isOfflineAvailable && !slot.isBooked;
        return false;
      })
      .map((slot) => ({
        time: slot.time,
        available: true,
      }));
  };
  
  const getAllSlots = (): TimeSlot[] => {
    if (!selectedDate || !scheduleData) return [];
    if (scheduleData.isBlocked) return [];
    
    return scheduleData.slots
      .filter((slot) => {
        if (consultationMode === "online") return slot.isOnlineAvailable;
        if (consultationMode === "offline") return slot.isOfflineAvailable;
        return false;
      })
      .map((slot) => ({
        time: slot.time,
        available: !slot.isBooked,
      }));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 30);

  const disabledDays = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today || d > maxDate;
  };

  const timeSlots = getAllSlots();

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      onSelectSlot(selectedDate, time);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">选择日期</CardTitle>
          <CardDescription>
            可预约未来30天内的时间
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
            }}
            disabled={disabledDays}
            locale={zhCN}
            className="rounded-md border"
            data-testid="calendar-booking"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">选择时间</CardTitle>
          <CardDescription>
            {selectedDate 
              ? format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })
              : "请先选择日期"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : timeSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(slot.time)}
                    className="h-12"
                    data-testid={`button-time-${slot.time}`}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {slot.time}
                    {!slot.available && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        已约
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {scheduleData?.isBlocked 
                  ? "当日不开放预约" 
                  : "当日无可用时间段"}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              请在左侧日历中选择日期
            </div>
          )}

          {selectedDate && selectedTime && (
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-sm font-medium mb-2">已选择：</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(selectedDate, "yyyy年M月d日", { locale: zhCN })} {selectedTime}
                </div>
                <div className="flex items-center gap-2">
                  {consultationMode === "online" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span>
                    {consultationType === "regular" ? "一般咨询" : "公益低价咨询"} · 
                    {consultationMode === "online" ? "线上" : "线下"} · 
                    {consultationType === "regular" ? "¥300" : "¥100"}/50分钟
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
