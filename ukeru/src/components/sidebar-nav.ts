import {
  LayoutDashboard,
  PhoneCall,
  Bot,
  BookOpen,
  Hash,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { title: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { title: "通話ログ", href: "/call-logs", icon: PhoneCall },
  { title: "エージェント", href: "/agents", icon: Bot },
  { title: "ナレッジ", href: "/knowledge", icon: BookOpen },
  { title: "電話番号", href: "/phone-numbers", icon: Hash },
  { title: "設定", href: "/settings", icon: Settings },
];
