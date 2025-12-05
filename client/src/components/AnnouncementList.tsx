import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Edit, Trash2, Plus, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isPinned: boolean;
}

interface AnnouncementListProps {
  isAdmin?: boolean;
}

export default function AnnouncementList({ isAdmin = false }: AnnouncementListProps) {
  // todo: remove mock functionality - fetch from API
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "春节期间咨询安排通知",
      content: "各位来访者好，春节期间（1月28日-2月4日）咨询服务暂停，2月5日起恢复正常预约。如有紧急情况，请拨打心理援助热线。祝大家新年快乐！",
      createdAt: new Date("2025-01-20"),
      isPinned: true,
    },
    {
      id: "2",
      title: "公益咨询名额开放通知",
      content: "2月份公益低价咨询名额已开放预约，本月共有10个名额，面向学生群体和经济困难人士。请有需要的来访者尽快预约。",
      createdAt: new Date("2025-01-15"),
      isPinned: false,
    },
    {
      id: "3",
      title: "线上咨询平台升级",
      content: "为了给大家提供更好的线上咨询体验，我们的视频咨询平台已完成升级，支持更稳定的连接和更清晰的画质。如在使用中遇到问题，请随时联系我。",
      createdAt: new Date("2025-01-10"),
      isPinned: false,
    },
  ]);

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      createdAt: new Date(),
      isPinned: false,
    };
    
    setAnnouncements([newAnnouncement, ...announcements]);
    setNewTitle("");
    setNewContent("");
    setIsCreateOpen(false);
    console.log("Created announcement:", newAnnouncement);
  };

  const handleEdit = () => {
    if (!editingAnnouncement || !newTitle.trim() || !newContent.trim()) return;
    
    setAnnouncements(announcements.map(a => 
      a.id === editingAnnouncement.id 
        ? { ...a, title: newTitle, content: newContent }
        : a
    ));
    setEditingAnnouncement(null);
    setNewTitle("");
    setNewContent("");
    setIsEditOpen(false);
    console.log("Edited announcement:", editingAnnouncement.id);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    console.log("Deleted announcement:", id);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-announcement">
                <Plus className="mr-2 h-4 w-4" />
                发布公告
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>发布新公告</DialogTitle>
                <DialogDescription>
                  发布的公告将对所有来访者可见
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    placeholder="请输入公告标题"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    data-testid="input-announcement-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">内容</label>
                  <Textarea
                    placeholder="请输入公告内容"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="min-h-[120px]"
                    data-testid="textarea-announcement-content"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} data-testid="button-confirm-create">
                  发布
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无公告</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} data-testid={`card-announcement-${announcement.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      {announcement.isPinned && (
                        <Badge variant="secondary">置顶</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(announcement.createdAt, "yyyy年M月d日", { locale: zhCN })}
                    </CardDescription>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(announcement)}
                        data-testid={`button-edit-${announcement.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-${announcement.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除这条公告吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(announcement.id)}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input
                placeholder="请输入公告标题"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">内容</label>
              <Textarea
                placeholder="请输入公告内容"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
