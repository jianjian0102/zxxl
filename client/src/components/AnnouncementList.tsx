import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Calendar, Edit, Trash2, Plus, Megaphone, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Announcement } from "@shared/schema";

interface AnnouncementListProps {
  isAdmin?: boolean;
}

export default function AnnouncementList({ isAdmin = false }: AnnouncementListProps) {
  const { toast } = useToast();
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; isPinned: boolean }) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setNewTitle("");
      setNewContent("");
      setIsPinned(false);
      setIsCreateOpen(false);
      toast({
        title: "发布成功",
        description: "公告已成功发布",
      });
    },
    onError: () => {
      toast({
        title: "发布失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      const response = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setEditingAnnouncement(null);
      setNewTitle("");
      setNewContent("");
      setIsPinned(false);
      setIsEditOpen(false);
      toast({
        title: "更新成功",
        description: "公告已更新",
      });
    },
    onError: () => {
      toast({
        title: "更新失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "删除成功",
        description: "公告已删除",
      });
    },
    onError: () => {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    createMutation.mutate({ title: newTitle, content: newContent, isPinned });
  };

  const handleEdit = () => {
    if (!editingAnnouncement || !newTitle.trim() || !newContent.trim()) return;
    updateMutation.mutate({
      id: editingAnnouncement.id,
      data: { title: newTitle, content: newContent, isPinned },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
    setIsPinned(announcement.isPinned);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPinned"
                    checked={isPinned}
                    onCheckedChange={(checked) => setIsPinned(checked === true)}
                  />
                  <Label htmlFor="isPinned">置顶此公告</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-confirm-create">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                      {announcement.createdAt && format(new Date(announcement.createdAt), "yyyy年M月d日", { locale: zhCN })}
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinnedEdit"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <Label htmlFor="isPinnedEdit">置顶此公告</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
