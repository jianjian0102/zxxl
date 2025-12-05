import AnnouncementList from "@/components/AnnouncementList";
import Footer from "@/components/Footer";

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-announcements-title">
                公告栏
              </h1>
              <p className="text-muted-foreground">
                查看咨询师发布的最新通知和信息
              </p>
            </div>

            <AnnouncementList isAdmin={false} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
