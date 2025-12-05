import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import counselorImage from "@assets/generated_images/professional_counselor_portrait_photo.png";

interface Message {
  id: string;
  content: string;
  sender: "client" | "counselor";
  createdAt: Date;
}

interface MessageCenterProps {
  isAdmin?: boolean;
}

export default function MessageCenter({ isAdmin = false }: MessageCenterProps) {
  // todo: remove mock functionality - fetch from API
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "李老师您好，我想咨询一下关于预约的问题。",
      sender: "client",
      createdAt: new Date("2025-01-19T10:30:00"),
    },
    {
      id: "2",
      content: "您好！很高兴收到您的留言，请问有什么可以帮助您的？",
      sender: "counselor",
      createdAt: new Date("2025-01-19T11:15:00"),
    },
    {
      id: "3",
      content: "我想问一下线上咨询和线下咨询有什么区别？我应该如何选择？",
      sender: "client",
      createdAt: new Date("2025-01-19T14:20:00"),
    },
    {
      id: "4",
      content: "线上咨询通过视频进行，适合时间紧张或距离较远的来访者。线下咨询在我的工作室进行，可以有更直接的互动体验。两种方式的咨询效果是一样的，您可以根据自己的便利性来选择。如果是第一次咨询，我个人建议可以先尝试线下，之后可以根据感受再决定。",
      sender: "counselor",
      createdAt: new Date("2025-01-19T15:00:00"),
    },
  ]);
  
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: isAdmin ? "counselor" : "client",
      createdAt: new Date(),
    };
    
    setMessages([...messages, message]);
    setNewMessage("");
    console.log("Sent message:", message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {isAdmin ? (
              <>
                <AvatarImage src="" />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </>
            ) : (
              <>
                <AvatarImage src={counselorImage} />
                <AvatarFallback>李</AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <div className="text-base font-medium">
              {isAdmin ? "来访者留言" : "与咨询师对话"}
            </div>
            <div className="text-sm text-muted-foreground font-normal">
              {isAdmin ? "回复来访者的咨询" : "有任何问题都可以留言"}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "counselor" ? "flex-row-reverse" : ""
              }`}
              data-testid={`message-${message.id}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                {message.sender === "counselor" ? (
                  <>
                    <AvatarImage src={counselorImage} />
                    <AvatarFallback>李</AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src="" />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </>
                )}
              </Avatar>
              <div
                className={`flex flex-col max-w-[75%] ${
                  message.sender === "counselor" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.sender === "counselor"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {format(message.createdAt, "M月d日 HH:mm", { locale: zhCN })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-3">
          <Textarea
            placeholder="输入消息..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-[120px] resize-none"
            data-testid="textarea-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </Card>
  );
}
