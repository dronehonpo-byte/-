/**
 * IconKey（ドメイン型）→ lucide-react アイコンコンポーネントの解決。
 *
 * ドメイン型 `IconKey` は文字列キーのみを持ち、UI ライブラリに依存しない。
 * 実コンポーネントへの対応付けはこの UI 層に閉じ込める（RN 移行時はここだけ差し替え）。
 */
import {
  Calendar,
  Clock,
  Bus,
  Sun,
  Pill,
  Utensils,
  Bath,
  Trash2,
  Heart,
  MessageCircle,
  MapPin,
  Footprints,
  Users,
  Cloud,
  ShoppingCart,
  Home,
  Phone,
  Coffee,
  Cross,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/types/voice";

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  calendar: Calendar,
  clock: Clock,
  bus: Bus,
  sun: Sun,
  pill: Pill,
  utensils: Utensils,
  bath: Bath,
  trash: Trash2,
  heart: Heart,
  "message-circle": MessageCircle,
  "map-pin": MapPin,
  footprints: Footprints,
  users: Users,
  cloud: Cloud,
  "shopping-cart": ShoppingCart,
  home: Home,
  phone: Phone,
  coffee: Coffee,
  hospital: Cross,
  "help-circle": HelpCircle,
};

/** 設定画面のアイコン選択で使う一覧（キー＋日本語ラベル） */
export const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "calendar", label: "予定" },
  { key: "clock", label: "時計" },
  { key: "bus", label: "送迎・バス" },
  { key: "sun", label: "天気・朝" },
  { key: "pill", label: "薬" },
  { key: "utensils", label: "食事" },
  { key: "bath", label: "お風呂" },
  { key: "trash", label: "ゴミ" },
  { key: "heart", label: "健康・気持ち" },
  { key: "message-circle", label: "メッセージ" },
  { key: "map-pin", label: "場所" },
  { key: "footprints", label: "予定・行動" },
  { key: "users", label: "家族" },
  { key: "cloud", label: "天気" },
  { key: "shopping-cart", label: "買い物" },
  { key: "home", label: "自宅" },
  { key: "phone", label: "電話" },
  { key: "coffee", label: "休憩" },
  { key: "hospital", label: "病院" },
  { key: "help-circle", label: "その他" },
];

export function resolveIcon(key: IconKey): LucideIcon {
  return ICON_MAP[key] ?? HelpCircle;
}
