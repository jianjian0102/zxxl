import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Heart } from "lucide-react";

export default function ServiceCards() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3" data-testid="text-services-title">
            咨询服务
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            根据您的需求选择合适的咨询类型，开启心灵成长之旅
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="hover-elevate relative overflow-visible" data-testid="card-regular-counseling">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>一般咨询</CardTitle>
              </div>
              <CardDescription>
                专业的一对一心理咨询服务，针对各类心理困扰提供深度支持
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">¥300</span>
                  <span className="text-muted-foreground">/ 50分钟</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    线上/线下可选
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    个性化咨询方案
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    持续跟进支持
                  </li>
                </ul>
                <Link href="/booking?type=regular" className="mt-4 block">
                  <Button className="w-full" data-testid="button-book-regular">
                    预约咨询
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate relative overflow-visible" data-testid="card-public-welfare-counseling">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>公益低价咨询</CardTitle>
              </div>
              <CardDescription>
                面向学生群体和经济困难人士，提供可负担的心理支持
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">¥150</span>
                  <span className="text-muted-foreground">/ 50分钟</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    学生/低收入群体优先
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    名额有限，需审核
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    同等专业服务
                  </li>
                </ul>
                <Link href="/booking?type=welfare" className="mt-4 block">
                  <Button variant="outline" className="w-full" data-testid="button-book-welfare">
                    申请预约
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
