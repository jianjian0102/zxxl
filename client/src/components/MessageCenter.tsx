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
import { Send, User, Loader2, MessageCircle, Mail, ArrowLeft, LogIn, Search, UserPlus, X, Image as ImageIcon } from "lucide-react";
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

interface AuthResponse {
  isLoggedIn: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

type VisitorView = "loading" | "email_prompt" | "new_conversation" | "chat";

export default function MessageCenter({ isAdmin = false }: MessageCenterProps) {
  const { toast } = useToast();
  // Common State
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Visitor Specific State
  const [visitorView, setVisitorView] = useState<VisitorView>("loading");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorSubject, setVisitorSubject] = useState("");

  // Admin Specific State
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [showAdminNewConv, setShowAdminNewConv] = useState(false);
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminNewName, setAdminNewName] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: authData, isLoading: authLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    enabled: !isAdmin,
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isAdmin,
  });

  const { data: myConversations, isLoading: loadingMyConversations } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/conversations/my"],
    enabled: !isAdmin && !!authData?.isLoggedIn,
  });

  const { data: conversationDetail, isLoading: loadingDetail } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const messages = conversationDetail?.messages || [];

  // Effects
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Visitor Layout Logic
    if (!isAdmin) {
      if (authLoading || (authData?.isLoggedIn && loadingMyConversations)) {
        setVisitorView("loading");
      } else if (authData?.isLoggedIn && authData.user?.email) {
        setVisitorEmail(authData.user.email);
        setVisitorName(authData.user.name || "");
        if (myConversations && myConversations.length > 0) {
          setSelectedConversationId(myConversations[0].id);
          setVisitorView("chat");
        } else {
          setVisitorView("new_conversation");
        }
      } else {
        setVisitorView("email_prompt");
      }
    }
  }, [isAdmin, authLoading, loadingMyConversations, authData, myConversations]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] }); // Refresh list for last message update
      setNewMessage("");
      handleRemoveFile();
    },
    onError: () => toast({ title: "发送失败", variant: "destructive" }),
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/my"] });
      setSelectedConversationId(newConv.id);
      setVisitorView("chat");
      toast({ title: "对话已创建" });
    },
    onError: (error: any) => {
      if (error?.existingConversationId) {
        setSelectedConversationId(error.existingConversationId);
        setVisitorView("chat");
        toast({ title: "已找到现有对话" });
      } else {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
      }
    },
  });

  const adminInitiateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/conversations/initiate", data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(result.id);
      setShowAdminNewConv(false);
      setAdminNewEmail("");
      setAdminNewName("");
      toast({ title: "对话已开启" });
    },
    onError: (err: any) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "图片过大", description: "最大支持5MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      setIsUploading(true);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return await res.json();
    } catch (e) {
      toast({ title: "图片上传失败", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversationId) return;

    let uploadData = null;
    if (selectedFile) {
      uploadData = await uploadFile();
      if (!uploadData) return;
    }

    const payload = {
      conversationId: selectedConversationId,
      content: newMessage,
      imageUrl: uploadData?.url,
      contentType: uploadData?.contentType,
      senderType: isAdmin ? "admin" : "visitor",
      // Important: if visitor, they might not be logged in, so we pass verifyEmail if needed by backend logic
      verifyEmail: !isAdmin && !authData?.isLoggedIn ? visitorEmail : undefined,
      senderName: isAdmin ? "咨询师" : (authData?.user?.name || conversationDetail?.visitorName || visitorName || "来访者"),
      isFromAdmin: isAdmin
    };

    sendMessageMutation.mutate(payload);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render Helpers
  const renderMessageList = () => (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {loadingDetail ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
          <MessageCircle className="w-12 h-12 mb-2" />
          <p>暂无消息</p>
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((msg) => {
            // Logic: 
            // If I am Admin -> My messages are (isFromAdmin=true) -> Align Right
            // If I am Visitor -> My messages are (isFromAdmin=false) -> Align Right
            const isMe = isAdmin ? msg.isFromAdmin : !msg.isFromAdmin;

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {msg.isFromAdmin ? (
                    <>
                      <AvatarImage src={counselorImage} />
                      <AvatarFallback>咨</AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  )}
                </Avatar>
                <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {format(new Date(msg.createdAt || new Date()), "HH:mm")}
                    </span>
                  </div>

                  <div className={`rounded-lg px-4 py-2 shadow-sm ${isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                    }`}>
                    {msg.imageUrl && (
                      <div className="mb-2 rounded overflow-hidden">
                        <img src={msg.imageUrl} alt="图片" className="max-w-full max-h-[200px] object-cover" />
                      </div>
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  const renderInputArea = () => (
    <div className="p-4 border-t bg-background">
      {previewUrl && (
        <div className="relative w-16 h-16 mb-2">
          <img src={previewUrl} className="w-full h-full object-cover rounded-md border" />
          <button onClick={handleRemoveFile} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Textarea
          placeholder="输入消息..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-[120px] resize-none"
        />
        <Button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || sendMessageMutation.isPending || isUploading}>
          {sendMessageMutation.isPending || isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  // --- Views ---

  // 1. Admin View
  if (isAdmin) {
    const filteredConvs = conversations.filter(c =>
      c.visitorName.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      c.visitorEmail.toLowerCase().includes(adminSearchTerm.toLowerCase())
    );

    return (
      <div className="grid md:grid-cols-3 gap-6 h-[600px]">
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">对话列表</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowAdminNewConv(!showAdminNewConv)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            {showAdminNewConv ? (
              <div className="p-2 bg-muted rounded-md space-y-2 animate-in slide-in-from-top-2">
                <Input placeholder="来访者邮箱" value={adminNewEmail} onChange={e => setAdminNewEmail(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="姓名 (选填)" value={adminNewName} onChange={e => setAdminNewName(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" className="w-full h-8" onClick={() => adminInitiateMutation.mutate({ visitorEmail: adminNewEmail, visitorName: adminNewName })}>
                  开启对话
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索..." className="pl-8" value={adminSearchTerm} onChange={e => setAdminSearchTerm(e.target.value)} />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredConvs.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">未找到对话</div>
              ) : (
                <div className="flex flex-col p-2 gap-1">
                  {filteredConvs.map(conv => (
                    <Button
                      key={conv.id}
                      variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                      className="justify-start h-auto py-3 px-3 w-full"
                      onClick={() => setSelectedConversationId(conv.id)}
                    >
                      <div className="flex flex-col items-start w-full overflow-hidden">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium truncate">{conv.visitorName}</span>
                          {conv.lastMessageAt && <span className="text-[10px] text-muted-foreground">{format(new Date(conv.lastMessageAt), "MM-dd")}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground w-full truncate text-left">
                          {conv.visitorEmail}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          {selectedConversationId ? (
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{conversationDetail?.visitorName}</div>
                    <div className="text-xs text-muted-foreground">{conversationDetail?.visitorEmail}</div>
                  </div>
                </div>
              </CardHeader>
              {renderMessageList()}
              {renderInputArea()}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
              <p>请选择左侧对话开始回复</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 2. Visitor Views
  if (visitorView === "loading") {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (visitorView === "email_prompt") {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center text-muted-foreground text-sm">
            请先登录以开始咨询
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/login"><Button variant="outline" className="w-full">登录</Button></Link>
            <Link href="/register"><Button className="w-full">注册</Button></Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visitorView === "new_conversation") {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>开始新对话</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">您的邮箱</label>
            <Input value={visitorEmail} disabled className="bg-muted" />
          </div>
          {!authData?.isLoggedIn && (
            <div className="space-y-2">
              <label className="text-sm font-medium">您的称呼</label>
              <Input placeholder="如何称呼您" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">咨询主题</label>
            <Input placeholder="简要描述..." value={visitorSubject} onChange={e => setVisitorSubject(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => createConversationMutation.mutate({ visitorEmail, visitorName: visitorName || "访客", subject: visitorSubject })}>
            开始对话
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setVisitorView("email_prompt")}>返回</Button>
        </CardContent>
      </Card>
    );
  }

  // Visitor Chat View
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={counselorImage} />
            <AvatarFallback>咨</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">在线咨询师</div>
            <div className="text-xs text-muted-foreground">通常在 24 小时内回复</div>
          </div>
        </div>
      </CardHeader>
      {renderMessageList()}
      {renderInputArea()}
    </Card>
  );
}
