import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, MapPin, ArrowLeft, History } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface BookingConfirmationProps {
  bookingDetails: {
    date: Date;
    time: string;
    consultationType: "regular" | "welfare";
    name: string;
    consultationMode: "online" | "offline";
  };
}

export default function BookingConfirmation({ bookingDetails }: BookingConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">预约申请已提交</CardTitle>
          <CardDescription>
            感谢您的预约，咨询师将尽快确认您的预约申请
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="font-medium">预约详情</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>日期：{format(bookingDetails.date, "yyyy年M月d日 EEEE", { locale: zhCN })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>时间：{bookingDetails.time}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>方式：{bookingDetails.consultationMode === "online" ? "线上咨询" : "线下咨询"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-medium">温馨提示</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 咨询师将在24小时内确认您的预约并通过邮箱联系您；线上咨询将通过视频方式进行，请确保网络稳定、环境保密</li>
              <li>• 如需更改预约时间，请提前24小时联系</li>
              <li>• 线下咨询地址将在确认预约后告知</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/" className="flex-1 min-w-[140px]">
              <Button variant="outline" className="w-full" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
            <Link href="/appointments" className="flex-1 min-w-[140px]">
              <Button variant="outline" className="w-full" data-testid="button-view-history">
                <History className="mr-2 h-4 w-4" />
                查看预约
              </Button>
            </Link>
            <Link href="/messages" className="flex-1 min-w-[140px]">
              <Button className="w-full" data-testid="button-go-messages">
                发送留言
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
