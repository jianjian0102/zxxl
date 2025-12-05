import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sparkles, Heart, Check } from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";
import IntakeForm from "@/components/IntakeForm";
import BookingConfirmation from "@/components/BookingConfirmation";
import Footer from "@/components/Footer";

type BookingStep = "select-type" | "select-time" | "fill-form" | "confirmation";
type ConsultationType = "regular" | "welfare";

export default function BookingPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialType = params.get("type") as ConsultationType | null;
  
  const [step, setStep] = useState<BookingStep>(initialType ? "select-time" : "select-type");
  const [consultationType, setConsultationType] = useState<ConsultationType | null>(initialType);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);

  const stepProgress = {
    "select-type": 25,
    "select-time": 50,
    "fill-form": 75,
    "confirmation": 100,
  };

  const stepLabels = ["选择类型", "选择时间", "填写表单", "完成"];

  const handleSelectType = (type: ConsultationType) => {
    setConsultationType(type);
    setStep("select-time");
  };

  const handleSelectSlot = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleContinueToForm = () => {
    if (selectedDate && selectedTime) {
      setStep("fill-form");
    }
  };

  const handleFormSubmit = (data: any) => {
    setFormData(data);
    setStep("confirmation");
    console.log("Booking completed:", { consultationType, selectedDate, selectedTime, ...data });
  };

  const handleBack = () => {
    if (step === "select-time") {
      setStep("select-type");
      setConsultationType(null);
    } else if (step === "fill-form") {
      setStep("select-time");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-booking-title">
                预约心理咨询
              </h1>
              <p className="text-muted-foreground">
                按照步骤完成预约，开启您的心理健康之旅
              </p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-2 text-sm">
                {stepLabels.map((label, index) => (
                  <span
                    key={index}
                    className={`${
                      index <= Object.keys(stepProgress).indexOf(step)
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <Progress value={stepProgress[step]} className="h-2" />
            </div>

            {step === "select-type" && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card
                  className="cursor-pointer hover-elevate overflow-visible"
                  onClick={() => handleSelectType("regular")}
                  data-testid="card-select-regular"
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle>一般咨询</CardTitle>
                    </div>
                    <CardDescription>
                      专业的一对一心理咨询服务
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-semibold">¥400</span>
                      <span className="text-muted-foreground">/ 50分钟</span>
                    </div>
                    <Button className="w-full">
                      选择此类型
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate relative overflow-visible"
                  onClick={() => handleSelectType("welfare")}
                  data-testid="card-select-welfare"
                >
                  <Badge className="absolute -top-3 right-4" variant="secondary">
                    公益优惠
                  </Badge>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-primary" />
                      <CardTitle>公益低价咨询</CardTitle>
                    </div>
                    <CardDescription>
                      面向学生和经济困难人士
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-semibold">¥100</span>
                      <span className="text-muted-foreground">/ 50分钟</span>
                    </div>
                    <Button variant="outline" className="w-full">
                      选择此类型
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === "select-time" && consultationType && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-type">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <Badge variant="secondary">
                      {consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                    </Badge>
                  </div>
                </div>

                <BookingCalendar
                  consultationType={consultationType}
                  onSelectSlot={handleSelectSlot}
                />

                {selectedDate && selectedTime && (
                  <div className="flex justify-end">
                    <Button onClick={handleContinueToForm} data-testid="button-continue-form">
                      继续填写申请表
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === "fill-form" && consultationType && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-calendar">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                    </Badge>
                    <Badge variant="outline">
                      {selectedDate && selectedTime
                        ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${selectedTime}`
                        : ""}
                    </Badge>
                  </div>
                </div>

                <IntakeForm
                  onSubmit={handleFormSubmit}
                  onBack={handleBack}
                />
              </div>
            )}

            {step === "confirmation" && selectedDate && selectedTime && formData && (
              <BookingConfirmation
                bookingDetails={{
                  date: selectedDate,
                  time: selectedTime,
                  consultationType: consultationType!,
                  name: formData.name,
                  consultationMode: formData.consultationMode,
                  contactPhone: formData.contactPhone,
                }}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
