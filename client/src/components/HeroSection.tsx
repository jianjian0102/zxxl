import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageCircle, Shield } from "lucide-react";
import counselorImage from "@assets/generated_images/professional_counselor_portrait_photo.png";

export default function HeroSection() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <Avatar className="w-40 h-40 md:w-48 md:h-48 mb-6 ring-4 ring-primary/20">
            <AvatarImage src={counselorImage} alt="心理咨询师" />
            <AvatarFallback className="text-4xl">简</AvatarFallback>
          </Avatar>
          
          <h1 className="text-3xl md:text-4xl font-semibold mb-3" data-testid="text-hero-title">
            简宏宇
          </h1>
          <p className="text-lg text-muted-foreground mb-2" data-testid="text-hero-subtitle">
            心理咨询博士在读｜青少年咨询师二级（韩国国家资格证）
          </p>
          <p className="text-muted-foreground mb-8 max-w-xl leading-relaxed" data-testid="text-hero-description">
            拥有3年心理咨询师经验，以人本主义为核心的综合流派。专注于情绪调节、人际关系、职业发展等领域。希望帮助每一位来访者建立内在秩序。
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Link href="/booking">
              <Button size="lg" data-testid="button-hero-booking">
                <Calendar className="mr-2 h-5 w-5" />
                立即预约
              </Button>
            </Link>
            <Link href="/messages">
              <Button size="lg" variant="outline" data-testid="button-hero-message">
                <MessageCircle className="mr-2 h-5 w-5" />
                在线留言
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
            <div className="flex flex-col items-center p-4 rounded-lg bg-card">
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">灵活预约</span>
              <span className="text-sm text-muted-foreground">在线选择时间</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-card">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">严格保密</span>
              <span className="text-sm text-muted-foreground">保护您的隐私</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-card">
              <MessageCircle className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">专业支持</span>
              <span className="text-sm text-muted-foreground">一对一咨询</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
