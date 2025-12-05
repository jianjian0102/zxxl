import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MessageCenter from "@/components/MessageCenter";
import Footer from "@/components/Footer";

export default function MessagesPage() {
  // todo: remove mock functionality - check auth from API
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-messages-title">
                在线留言
              </h1>
              <p className="text-muted-foreground">
                有任何问题都可以在这里留言，咨询师会尽快回复
              </p>
            </div>

            <Tabs defaultValue="visitor" className="mb-6">
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="visitor" onClick={() => setIsAdmin(false)} data-testid="tab-visitor-msg">
                  来访者视图
                </TabsTrigger>
                <TabsTrigger value="admin" onClick={() => setIsAdmin(true)} data-testid="tab-admin-msg">
                  咨询师视图
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <MessageCenter isAdmin={isAdmin} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
