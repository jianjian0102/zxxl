import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, User, Loader2, MessageCircle, Mail, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import counselorImage from "@assets/generated_images/professional_counselor_portrait_photo.png";
import type { Conversation, Message } from "@shared/schema";

interface MessageCenterProps {
  isAdmin?: boolean;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

type VisitorView = "email_entry" | "new_conversation" | "chat";

export default function MessageCenter({ isAdmin = false }: MessageCenterProps) {
  const { toast } = useToast();
  const [visitorView, setVisitorView] = useState<VisitorView>("email_entry");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [subject, setSubject] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAdmin,
  });

  const { data: conversationDetail, isLoading: loadingDetail } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const { data: existingConversation, isLoading: checkingEmail, refetch: checkEmail } = useQuery<ConversationWithMessages>({
    queryKey: [`/api/conversations/by-email/${encodeURIComponent(searchedEmail)}`],
    enabled: false,
    retry: false,
  });

  const messages = conversationDetail?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { visitorName: string; visitorEmail: string; subject?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(newConversation.id);
      setVisitorView("chat");
      toast({
        title: "对话已创建",
        description: "您可以开始发送消息了",
      });
    },
    onError: (error: any) => {
      if (error?.existingConversationId) {
        setSelectedConversationId(error.existingConversationId);
        setVisitorView("chat");
        toast({
          title: "已找到您的对话",
          description: "您已有一个对话，正在为您打开",
        });
      } else {
        toast({
          title: "创建失败",
          description: error?.message || "请稍后重试",
          variant: "destructive",
        });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string; senderName: string; isFromAdmin: boolean }) => {
      const response = await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, {
        content: data.content,
        senderName: data.senderName,
        isFromAdmin: data.isFromAdmin,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "发送失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorEmail.trim()) {
      toast({
        title: "请输入邮箱",
        description: "邮箱是必填项",
        variant: "destructive",
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      toast({
        title: "邮箱格式不正确",
        description: "请输入有效的邮箱地址",
        variant: "destructive",
      });
      return;
    }

    setSearchedEmail(visitorEmail);
    
    try {
      const response = await fetch(`/api/conversations/by-email/${encodeURIComponent(visitorEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedConversationId(data.id);
        setVisitorView("chat");
        toast({
          title: "找到您的对话",
          description: "正在为您打开已有对话",
        });
      } else if (response.status === 404) {
        setVisitorView("new_conversation");
      } else {
        throw new Error("查询失败");
      }
    } catch (error) {
      toast({
        title: "查询失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleCreateConversation = () => {
    if (!visitorName.trim()) {
      toast({
        title: "请输入姓名",
        description: "姓名是必填项",
        variant: "destructive",
      });
      return;
    }
    createConversationMutation.mutate({
      visitorName,
      visitorEmail: searchedEmail,
      subject: subject || undefined,
    });
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: newMessage,
      senderName: isAdmin ? "咨询师" : conversationDetail?.visitorName || "来访者",
      isFromAdmin: isAdmin,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackToEmail = () => {
    setVisitorView("email_entry");
    setSearchedEmail("");
    setVisitorName("");
    setSubject("");
    setSelectedConversationId(null);
  };

  if (loadingConversations && isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">对话列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  暂无对话
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto py-3"
                      onClick={() => setSelectedConversationId(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conv.visitorName}</span>
                          {conv.isResolved && (
                            <Badge variant="outline" className="text-xs">已解决</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.visitorEmail || conv.subject || "一般咨询"}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 h-[600px] flex flex-col">
          {selectedConversationId && conversationDetail ? (
            <>
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-base font-medium">{conversationDetail.visitorName}</div>
                    <div className="text-sm text-muted-foreground font-normal">
                      {conversationDetail.visitorEmail}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.isFromAdmin ? "flex-row-reverse" : ""}`}
                        data-testid={`message-${message.id}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {message.isFromAdmin ? (
                            <>
                              <AvatarImage src={counselorImage} />
                              <AvatarFallback>咨</AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          )}
                        </Avatar>
                        <div className={`flex flex-col max-w-[75%] ${message.isFromAdmin ? "items-end" : "items-start"}`}>
                          <div className={`rounded-lg px-4 py-2 ${message.isFromAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {message.createdAt && format(new Date(message.createdAt), "M月d日 HH:mm", { locale: zhCN })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="输入回复..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[44px] max-h-[120px] resize-none"
                    data-testid="textarea-message-admin"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message-admin"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请选择一个对话</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  if (visitorView === "email_entry") {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={counselorImage} />
              <AvatarFallback>咨</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-base font-medium">留言咨询</div>
              <div className="text-sm text-muted-foreground font-normal">
                请输入您的邮箱开始留言
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                您的邮箱 *
              </label>
              <Input
                type="email"
                placeholder="请输入邮箱"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                data-testid="input-visitor-email"
              />
              <p className="text-xs text-muted-foreground">
                每个邮箱只能开启一个对话，如已有对话将自动打开
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={checkingEmail}
              data-testid="button-check-email"
            >
              {checkingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              继续
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (visitorView === "new_conversation") {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={counselorImage} />
              <AvatarFallback>咨</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-base font-medium">开始新对话</div>
              <div className="text-sm text-muted-foreground font-normal">
                请填写您的信息开始留言
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">您的邮箱</div>
            <div className="font-medium">{searchedEmail}</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">您的姓名 *</label>
            <Input
              placeholder="请输入姓名"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              data-testid="input-visitor-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">主题（选填）</label>
            <Input
              placeholder="简要说明您的问题"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-subject"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBackToEmail}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateConversation}
              disabled={createConversationMutation.isPending}
              data-testid="button-start-conversation"
            >
              {createConversationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              开始对话
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={counselorImage} />
              <AvatarFallback>咨</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-base font-medium">与咨询师对话</div>
              <div className="text-sm text-muted-foreground font-normal">
                {searchedEmail || conversationDetail?.visitorEmail}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToEmail}
            data-testid="button-change-email"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            更换邮箱
          </Button>
        </CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>开始发送您的第一条消息</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isFromAdmin ? "" : "flex-row-reverse"}`}
                data-testid={`message-${message.id}`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {message.isFromAdmin ? (
                    <>
                      <AvatarImage src={counselorImage} />
                      <AvatarFallback>咨</AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  )}
                </Avatar>
                <div className={`flex flex-col max-w-[75%] ${message.isFromAdmin ? "items-start" : "items-end"}`}>
                  <div className={`rounded-lg px-4 py-2 ${message.isFromAdmin ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {message.createdAt && format(new Date(message.createdAt), "M月d日 HH:mm", { locale: zhCN })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </Card>
  );
}
