import { useState } from "react";
import { useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Sparkles, Heart, Loader2, Monitor, MapPin } from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";
import IntakeForm from "@/components/IntakeForm";
import BookingConfirmation from "@/components/BookingConfirmation";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type BookingStep = "select-type" | "select-mode" | "welfare-confirm" | "select-time" | "fill-form" | "confirmation";
type ConsultationType = "regular" | "welfare";
type ConsultationMode = "online" | "offline";

export default function BookingPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialType = params.get("type") as ConsultationType | null;
  const { toast } = useToast();
  
  const [step, setStep] = useState<BookingStep>(initialType ? (initialType === "welfare" ? "welfare-confirm" : "select-mode") : "select-type");
  const [consultationType, setConsultationType] = useState<ConsultationType | null>(initialType);
  const [consultationMode, setConsultationMode] = useState<ConsultationMode | null>(initialType === "welfare" ? "online" : null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [showWelfareConfirm, setShowWelfareConfirm] = useState(initialType === "welfare");

  const getStepProgress = () => {
    if (consultationType === "welfare") {
      switch (step) {
        case "select-type": return 20;
        case "welfare-confirm": return 40;
        case "select-time": return 60;
        case "fill-form": return 80;
        case "confirmation": return 100;
        default: return 20;
      }
    } else {
      switch (step) {
        case "select-type": return 20;
        case "select-mode": return 40;
        case "select-time": return 60;
        case "fill-form": return 80;
        case "confirmation": return 100;
        default: return 20;
      }
    }
  };

  const getStepLabels = () => {
    if (consultationType === "welfare") {
      return ["选择类型", "确认须知", "选择时间", "填写表单", "完成"];
    }
    return ["选择类型", "选择方式", "选择时间", "填写表单", "完成"];
  };

  const getCurrentStepIndex = () => {
    if (consultationType === "welfare") {
      const steps = ["select-type", "welfare-confirm", "select-time", "fill-form", "confirmation"];
      return steps.indexOf(step);
    }
    const steps = ["select-type", "select-mode", "select-time", "fill-form", "confirmation"];
    return steps.indexOf(step);
  };

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/appointments", data);
      return response.json();
    },
    onSuccess: (result) => {
      setFormData(result);
      setStep("confirmation");
      toast({
        title: "预约成功",
        description: "您的预约申请已提交，咨询师将尽快确认",
      });
    },
    onError: (error: any) => {
      const message = error.message.includes("409") 
        ? "该时间段已被预约，请选择其他时间" 
        : "预约失败，请稍后重试";
      toast({
        title: "预约失败",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSelectType = (type: ConsultationType) => {
    setConsultationType(type);
    if (type === "welfare") {
      setConsultationMode("online");
      setShowWelfareConfirm(true);
      setStep("welfare-confirm");
    } else {
      setStep("select-mode");
    }
  };

  const handleSelectMode = (mode: ConsultationMode) => {
    setConsultationMode(mode);
  };

  const handleContinueToCalendar = () => {
    if (consultationMode) {
      setStep("select-time");
    }
  };

  const handleWelfareConfirm = () => {
    setShowWelfareConfirm(false);
    setStep("select-time");
  };

  const handleWelfareCancel = () => {
    setShowWelfareConfirm(false);
    setStep("select-type");
    setConsultationType(null);
    setConsultationMode(null);
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

  const handleFormSubmit = async (data: any) => {
    if (!selectedDate || !selectedTime || !consultationType || !consultationMode) return;
    
    const appointmentData = {
      appointmentDate: format(selectedDate, "yyyy-MM-dd"),
      appointmentTime: selectedTime,
      consultationType: consultationType,
      consultationMode: consultationMode,
      name: data.name,
      gender: data.gender,
      birthDate: data.birthDate,
      occupation: data.occupation,
      hobbies: data.hobbies || null,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail || null,
      emergencyContact: null,
      hasPreviousCounseling: data.previousCounseling === "yes",
      previousCounselingDetails: null,
      hasMentalDiagnosis: data.diagnosedCondition === "yes",
      mentalDiagnosisDetails: null,
      currentMedication: data.currentMedication || null,
      consultationTopics: data.concernTopics,
      situationDescription: data.detailedDescription,
      dataCollectionConsent: data.dataCollectionConsent,
      confidentialityConsent: data.confidentialityConsent,
      welfareProofDescription: data.welfareProofDescription || null,
    };
    
    createAppointmentMutation.mutate(appointmentData);
  };

  const handleBack = () => {
    if (step === "select-mode") {
      setStep("select-type");
      setConsultationType(null);
      setConsultationMode(null);
    } else if (step === "welfare-confirm") {
      setStep("select-type");
      setConsultationType(null);
      setConsultationMode(null);
    } else if (step === "select-time") {
      if (consultationType === "welfare") {
        setStep("welfare-confirm");
        setShowWelfareConfirm(true);
      } else {
        setStep("select-mode");
      }
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
                {getStepLabels().map((label, index) => (
                  <span
                    key={index}
                    className={`${
                      index <= getCurrentStepIndex()
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <Progress value={getStepProgress()} className="h-2" />
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
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-3xl font-semibold">¥300</span>
                      <span className="text-muted-foreground">/ 50分钟</span>
                    </div>
                    <Button className="w-full">
                      选择此类型
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate overflow-visible"
                  onClick={() => handleSelectType("welfare")}
                  data-testid="card-select-welfare"
                >
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
                    <div className="flex items-baseline gap-2 mb-6">
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

            {step === "select-mode" && consultationType === "regular" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-type">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <Badge variant="secondary">一般咨询</Badge>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>选择咨询方式</CardTitle>
                    <CardDescription>
                      请选择您希望的咨询方式，线上和线下的可预约时间可能有所不同
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <RadioGroup
                      value={consultationMode || ""}
                      onValueChange={(value) => handleSelectMode(value as ConsultationMode)}
                      className="grid md:grid-cols-2 gap-4"
                    >
                      <div className="relative">
                        <RadioGroupItem
                          value="online"
                          id="mode-online"
                          className="peer sr-only"
                          data-testid="radio-mode-online"
                        />
                        <Label
                          htmlFor="mode-online"
                          className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
                        >
                          <Monitor className="h-10 w-10 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-lg">线上咨询</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              通过视频进行咨询，时间更灵活
                            </div>
                          </div>
                        </Label>
                      </div>

                      <div className="relative">
                        <RadioGroupItem
                          value="offline"
                          id="mode-offline"
                          className="peer sr-only"
                          data-testid="radio-mode-offline"
                        />
                        <Label
                          htmlFor="mode-offline"
                          className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 cursor-pointer transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
                        >
                          <MapPin className="h-10 w-10 text-primary" />
                          <div className="text-center">
                            <div className="font-medium text-lg">线下咨询</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              面对面咨询，更加私密舒适
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleContinueToCalendar}
                        disabled={!consultationMode}
                        data-testid="button-continue-calendar"
                      >
                        继续选择时间
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === "welfare-confirm" && (
              <AlertDialog open={showWelfareConfirm} onOpenChange={setShowWelfareConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>公益低价咨询须知</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>公益低价咨询只能通过<strong>线上方式</strong>进行。</p>
                      <p>申请时需要提供学生证或其他经济困难相关证明。</p>
                      <p>是否希望继续申请？</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleWelfareCancel} data-testid="button-welfare-cancel">
                      返回选择
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleWelfareConfirm} data-testid="button-welfare-confirm">
                      继续申请
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {step === "select-time" && consultationType && consultationMode && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-mode">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                    </Badge>
                    <Badge variant="outline">
                      {consultationMode === "online" ? "线上" : "线下"}
                    </Badge>
                  </div>
                </div>

                <BookingCalendar
                  consultationType={consultationType}
                  consultationMode={consultationMode}
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

            {step === "fill-form" && consultationType && consultationMode && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-calendar">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {consultationType === "regular" ? "一般咨询" : "公益低价咨询"}
                    </Badge>
                    <Badge variant="outline">
                      {consultationMode === "online" ? "线上" : "线下"}
                    </Badge>
                    <Badge variant="outline">
                      {selectedDate && selectedTime
                        ? `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${selectedTime}`
                        : ""}
                    </Badge>
                  </div>
                </div>

                <IntakeForm
                  consultationType={consultationType}
                  consultationMode={consultationMode}
                  onSubmit={handleFormSubmit}
                  onBack={handleBack}
                  isSubmitting={createAppointmentMutation.isPending}
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
                  consultationMode: consultationMode!,
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
