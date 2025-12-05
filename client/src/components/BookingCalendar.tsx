import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Video } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingCalendarProps {
  consultationType: "regular" | "welfare";
  onSelectSlot: (date: Date, time: string) => void;
}

export default function BookingCalendar({ consultationType, onSelectSlot }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // todo: remove mock functionality - fetch from API
  const getAvailableSlots = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return [];
    
    const baseSlots = [
      { time: "09:00", available: true },
      { time: "10:00", available: true },
      { time: "11:00", available: false },
      { time: "14:00", available: true },
      { time: "15:00", available: true },
      { time: "16:00", available: false },
      { time: "17:00", available: true },
    ];
    
    return baseSlots.map((slot, index) => ({
      ...slot,
      available: slot.available && (date.getDate() + index) % 3 !== 0,
    }));
  };

  const today = new Date();
  const maxDate = addDays(today, 30);

  const disabledDays = (date: Date) => {
    return date < today || date > maxDate || date.getDay() === 0 || date.getDay() === 6;
  };

  const timeSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

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
            可预约未来30天内的时间（周末休息）
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
            timeSlots.length > 0 ? (
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
                当日无可用时间段
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
                  {consultationType === "regular" ? (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span>一般咨询 · ¥400/50分钟</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      <span>公益低价咨询 · ¥100/50分钟</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
