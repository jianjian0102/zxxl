import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, Briefcase, BookOpen } from "lucide-react";

export default function AboutSection() {
  const qualifications = [
    { icon: GraduationCap, label: "建国大学心理咨询博士（韩国）" },
    { icon: GraduationCap, label: "庆熙大学心理咨询硕士（韩国）" },
    { icon: Award, label: "青少年咨询师二级（韩国国家资格证）" },
    { icon: Briefcase, label: "3年执业经验" },
  ];

  const specialties = [
    "情绪调节",
    "人际关系",
    "职业发展",
    "自我探索",
    "焦虑抑郁",
    "压力管理",
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3" data-testid="text-about-title">
            关于我
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            了解我的专业背景和咨询理念
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">专业资质</h3>
                  <div className="space-y-3">
                    {qualifications.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">擅长领域</h3>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="text-lg font-medium mt-6 mb-3">咨询理念</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    我相信每个人都拥有自我成长和疗愈的能力。在咨询过程中，
                    我将以真诚、接纳、共情的态度陪伴您，一起探索内心世界，
                    理解困扰的根源，找到属于您的解决方案。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
