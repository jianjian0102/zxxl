import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnnouncementList from "@/components/AnnouncementList";
import Footer from "@/components/Footer";

export default function AnnouncementsPage() {
  // todo: remove mock functionality - check auth from API
  const [isAdmin, setIsAdmin] = useState(false);

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

            <Tabs defaultValue="visitor" className="mb-6">
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="visitor" onClick={() => setIsAdmin(false)} data-testid="tab-visitor">
                  访客视图
                </TabsTrigger>
                <TabsTrigger value="admin" onClick={() => setIsAdmin(true)} data-testid="tab-admin">
                  管理员视图
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <AnnouncementList isAdmin={isAdmin} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
