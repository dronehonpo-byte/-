import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYen(value: number) {
  return value.toLocaleString("ja-JP") + "円";
}

export function formatManYen(value: number) {
  // 1 unit = 1万
  return value.toLocaleString("ja-JP") + "万円";
}
