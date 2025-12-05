import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">秩序心理</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              专业心理咨询服务，陪伴您找到属于自己的内在秩序。
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">联系方式</h3>
            <div className="text-sm text-muted-foreground">
              <p>邮箱：jianhongyu0102@outlook.com</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-4">咨询时间</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>周一至周五：10:00 - 20:00</p>
              <p>周六、周日：休息</p>
              <p className="text-xs mt-3">
                * 如需预约别的时间请留言
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 秩序心理 保留所有权利</p>
          <p className="mt-1 text-xs">
            如您正处于危机中，请拨打心理援助热线：12356
          </p>
        </div>
      </div>
    </footer>
  );
}
