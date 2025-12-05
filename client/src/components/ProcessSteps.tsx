import { MousePointer, Calendar, ClipboardList, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: MousePointer,
    title: "选择咨询类型",
    description: "根据您的需求选择一般咨询或公益低价咨询",
  },
  {
    icon: Calendar,
    title: "选择预约时间",
    description: "在日历中查看可用时间段并选择合适的咨询时间",
  },
  {
    icon: ClipboardList,
    title: "填写申请表",
    description: "填写基本信息和咨询需求，帮助咨询师了解您的情况",
  },
  {
    icon: CheckCircle,
    title: "完成预约",
    description: "确认信息后提交预约，等待咨询师确认",
  },
];

export default function ProcessSteps() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3" data-testid="text-process-title">
            预约流程
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            简单四步，轻松完成心理咨询预约
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center p-6"
              data-testid={`card-step-${index + 1}`}
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/30" />
              )}
              <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <step.icon className="h-7 w-7 text-primary" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
