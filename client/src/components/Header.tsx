import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Heart, Moon, Sun, User, LogOut, Calendar, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
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

export default function Header({ isDarkMode, toggleDarkMode }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "已登出" });
      setLocation("/");
    },
  });

  const navItems = [
    { href: "/", label: "首页" },
    { href: "/booking", label: "预约咨询" },
    { href: "/appointments", label: "我的预约" },
    { href: "/announcements", label: "公告栏" },
    { href: "/messages", label: "留言" },
  ];

  const isActive = (href: string) => location === href;
  const isLoggedIn = authData?.isLoggedIn;
  const user = authData?.user;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <Heart className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">秩序心理</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className="toggle-elevate"
                data-testid={`link-nav-${item.label}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleDarkMode}
            data-testid="button-theme-toggle"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-user-menu">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-24 truncate">{user.name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/appointments" className="flex items-center gap-2 w-full cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    我的预约
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/messages" className="flex items-center gap-2 w-full cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    我的留言
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-2 cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? "登出中..." : "退出登录"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="default" data-testid="button-register">
                  注册
                </Button>
              </Link>
            </div>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button size="icon" variant="ghost" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      data-testid={`link-mobile-nav-${item.label}`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                ))}
                {!isLoggedIn && (
                  <>
                    <div className="border-t pt-4 mt-2" />
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full" data-testid="link-mobile-login">
                        登录
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" data-testid="link-mobile-register">
                        注册
                      </Button>
                    </Link>
                  </>
                )}
                {isLoggedIn && user && (
                  <>
                    <div className="border-t pt-4 mt-2" />
                    <div className="px-2 text-sm text-muted-foreground">
                      已登录: {user.name || user.email}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        logoutMutation.mutate();
                        setIsOpen(false);
                      }}
                      disabled={logoutMutation.isPending}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      退出登录
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
