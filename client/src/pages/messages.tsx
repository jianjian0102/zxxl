import MessageCenter from "@/components/MessageCenter";
import Footer from "@/components/Footer";

export default function MessagesPage() {
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

            <MessageCenter isAdmin={false} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
