import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, User, Loader2, MessageCircle, Mail, ArrowLeft, LogIn, Search, Plus, UserPlus } from "lucide-react";
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

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface AuthResponse {
  isLoggedIn: boolean;
  user: AuthUser | null;
}

type VisitorView = "email_entry" | "new_conversation" | "chat" | "loading";

export default function MessageCenter({ isAdmin = false }: MessageCenterProps) {
  const { toast } = useToast();
  const [visitorView, setVisitorView] = useState<VisitorView>("loading");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [subject, setSubject] = useState("");
  const [adminSearchEmail, setAdminSearchEmail] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminNewName, setAdminNewName] = useState("");
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: authData, isLoading: authLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    enabled: !isAdmin,
  });

  const isLoggedIn = authData?.isLoggedIn;
  const user = authData?.user;

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAdmin,
  });

  const { data: myConversations, isLoading: loadingMyConversations } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/conversations/my"],
    enabled: !isAdmin && isLoggedIn === true,
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

  useEffect(() => {
    if (isAdmin) return;
    
    if (authLoading || (isLoggedIn && loadingMyConversations)) {
      setVisitorView("loading");
      return;
    }

    if (isLoggedIn && user?.email) {
      setSearchedEmail(user.email);
      setVisitorName(user.name || "");
      
      if (myConversations && myConversations.length > 0) {
        setSelectedConversationId(myConversations[0].id);
        setVisitorView("chat");
      } else {
        setVisitorView("new_conversation");
      }
    } else if (!authLoading) {
      setVisitorView("email_entry");
    }
  }, [isAdmin, authLoading, isLoggedIn, user, myConversations, loadingMyConversations]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { visitorName: string; visitorEmail: string; subject?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (isLoggedIn) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/my"] });
      }
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
    mutationFn: async (data: { conversationId: string; content: string; senderName: string; isFromAdmin: boolean; verifyEmail?: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, {
        content: data.content,
        senderName: data.senderName,
        senderType: data.isFromAdmin ? "admin" : "visitor",
        verifyEmail: data.verifyEmail,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (isLoggedIn) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations/my"] });
      }
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
    const nameToUse = isLoggedIn ? (user?.name || user?.email || "来访者") : visitorName;
    if (!nameToUse.trim()) {
      toast({
        title: "请输入姓名",
        description: "姓名是必填项",
        variant: "destructive",
      });
      return;
    }
    createConversationMutation.mutate({
      visitorName: nameToUse,
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
      verifyEmail: isAdmin ? undefined : searchedEmail,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackToEmail = () => {
    if (isLoggedIn) {
      return;
    }
    setVisitorView("email_entry");
    setSearchedEmail("");
    setVisitorName("");
    setSubject("");
    setSelectedConversationId(null);
  };

  const adminInitiateConversationMutation = useMutation({
    mutationFn: async (data: { visitorEmail: string; visitorName?: string }) => {
      const response = await apiRequest("POST", "/api/admin/conversations/initiate", data);
      return response.json();
    },
    onSuccess: (result: ConversationWithMessages & { isExisting: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(result.id);
      setShowNewConversationForm(false);
      setAdminNewEmail("");
      setAdminNewName("");
      toast({
        title: result.isExisting ? "已打开对话" : "对话已创建",
        description: result.isExisting ? "该邮箱已有对话" : "可以开始发送消息",
      });
    },
    onError: (error: any) => {
      toast({
        title: "操作失败",
        description: error?.message || "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleAdminInitiateConversation = () => {
    if (!adminNewEmail.trim()) {
      toast({
        title: "请输入邮箱",
        variant: "destructive",
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminNewEmail)) {
      toast({
        title: "邮箱格式不正确",
        variant: "destructive",
      });
      return;
    }
    adminInitiateConversationMutation.mutate({
      visitorEmail: adminNewEmail,
      visitorName: adminNewName || undefined,
    });
  };

  const filteredConversations = adminSearchEmail.trim() 
    ? conversations.filter(conv => 
        conv.visitorEmail?.toLowerCase().includes(adminSearchEmail.toLowerCase()) ||
        conv.visitorName?.toLowerCase().includes(adminSearchEmail.toLowerCase())
      )
    : conversations;

  if ((loadingConversations && isAdmin) || visitorView === "loading") {
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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">对话列表</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewConversationForm(!showNewConversationForm)}
                data-testid="button-new-conversation"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {showNewConversationForm && (
              <div className="mt-3 p-3 bg-muted rounded-md space-y-2">
                <p className="text-xs text-muted-foreground mb-2">发起新对话（输入来访者邮箱）</p>
                <Input
                  type="email"
                  placeholder="来访者邮箱"
                  value={adminNewEmail}
                  onChange={(e) => setAdminNewEmail(e.target.value)}
                  data-testid="input-admin-new-email"
                />
                <Input
                  placeholder="姓名（选填）"
                  value={adminNewName}
                  onChange={(e) => setAdminNewName(e.target.value)}
                  data-testid="input-admin-new-name"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAdminInitiateConversation}
                  disabled={adminInitiateConversationMutation.isPending}
                  data-testid="button-admin-initiate-conversation"
                >
                  {adminInitiateConversationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  发起对话
                </Button>
              </div>
            )}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索邮箱或姓名"
                value={adminSearchEmail}
                onChange={(e) => setAdminSearchEmail(e.target.value)}
                className="pl-9"
                data-testid="input-admin-search"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {adminSearchEmail ? "未找到匹配的对话" : "暂无对话"}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conv) => (
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
                登录后可自动查看您的对话
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <LogIn className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              登录后可方便地管理您的对话
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link href="/login">
                <Button variant="outline" size="sm" data-testid="button-login-prompt">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="button-register-prompt">
                  注册账号
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                使用邮箱继续
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
              variant="outline"
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
                {isLoggedIn ? "输入您的问题开始对话" : "请填写您的信息开始留言"}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">{isLoggedIn ? "已登录" : "您的邮箱"}</div>
            <div className="font-medium">{isLoggedIn && user?.name ? `${user.name} (${searchedEmail})` : searchedEmail}</div>
          </div>
          {!isLoggedIn && (
            <div className="space-y-2">
              <label className="text-sm font-medium">您的姓名 *</label>
              <Input
                placeholder="请输入姓名"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                data-testid="input-visitor-name"
              />
            </div>
          )}
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
            {!isLoggedIn && (
              <Button
                variant="outline"
                onClick={handleBackToEmail}
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleCreateConversation}
              disabled={createConversationMutation.isPending || (!isLoggedIn && !visitorName.trim())}
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
          {!isLoggedIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToEmail}
              data-testid="button-change-email"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              更换邮箱
            </Button>
          )}
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
