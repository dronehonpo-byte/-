/**
 * 初期テンプレートデータ（要件定義書 3-4）。
 *
 * ストアが空（初回起動）のときに投入される。
 * 家族が設定画面で自由に追加・編集・削除できる。
 */
import type { VoiceButton, VoiceCategory } from "@/types/voice";
import type { WatchedPerson, DailyRoute, LocationSample } from "@/types/location";

/* -------------------------------------------------------------------------- */
/* 機能①: 音声ボタン初期テンプレート                                          */
/* -------------------------------------------------------------------------- */

export const INITIAL_CATEGORIES: VoiceCategory[] = [
  { id: "cat-schedule", title: "よてい", icon: "calendar", order: 0 },
  { id: "cat-life", title: "くらし", icon: "coffee", order: 1 },
  { id: "cat-family", title: "かぞく", icon: "users", order: 2 },
  { id: "cat-info", title: "てんき・かいもの", icon: "cloud", order: 3 },
];

export const INITIAL_BUTTONS: VoiceButton[] = [
  // --- よてい ---
  {
    id: "btn-today-plan",
    categoryId: "cat-schedule",
    title: "今日の予定",
    answer: "今日は 10時に 病院へ 行きます。お昼までには 帰ってこられます。",
    icon: "calendar",
    order: 0,
  },
  {
    id: "btn-dayservice",
    categoryId: "cat-schedule",
    title: "デイサービスのお迎え",
    answer: "デイサービスの お迎えは 朝 9時です。玄関で 待っていてください。",
    icon: "bus",
    order: 1,
  },
  {
    id: "btn-hospital-day",
    categoryId: "cat-schedule",
    title: "病院の日",
    answer: "次の 病院は 今週の 木曜日です。持ち物は 診察券と お薬手帳です。",
    icon: "hospital",
    order: 2,
  },
  {
    id: "btn-next",
    categoryId: "cat-schedule",
    title: "次にすること",
    answer: "次は お昼ごはんの 時間です。台所に ごはんが 用意してあります。",
    icon: "footprints",
    order: 3,
  },
  {
    id: "btn-visitor",
    categoryId: "cat-schedule",
    title: "今日は誰が来る",
    answer: "今日の 午後3時に 娘の ゆきこさんが 来てくれます。",
    icon: "users",
    order: 4,
  },

  // --- くらし ---
  {
    id: "btn-weekday",
    categoryId: "cat-life",
    title: "今日は何曜日",
    answer: "今日は {曜日} です。",
    icon: "calendar",
    order: 0,
  },
  {
    id: "btn-date",
    categoryId: "cat-life",
    title: "今日は何日",
    answer: "今日は {年月日} です。",
    icon: "clock",
    order: 1,
  },
  {
    id: "btn-medicine",
    categoryId: "cat-life",
    title: "薬は飲んだ",
    answer: "朝の お薬は 飲みました。次は 夕ごはんの あとに 飲んでください。",
    icon: "pill",
    order: 2,
  },
  {
    id: "btn-breakfast",
    categoryId: "cat-life",
    title: "朝ごはん",
    answer: "朝ごはんは 食べました。パンと 牛乳と たまごでした。",
    icon: "utensils",
    order: 3,
  },
  {
    id: "btn-lunch",
    categoryId: "cat-life",
    title: "昼ごはん",
    answer: "お昼ごはんは 12時ごろ です。台所に 用意してあります。",
    icon: "utensils",
    order: 4,
  },
  {
    id: "btn-dinner",
    categoryId: "cat-life",
    title: "夕ごはん",
    answer: "夕ごはんは 午後6時ごろ です。娘さんが 作りに 来てくれます。",
    icon: "utensils",
    order: 5,
  },
  {
    id: "btn-bath",
    categoryId: "cat-life",
    title: "お風呂",
    answer: "お風呂は 夜8時に 入りましょう。お湯は 温めに してあります。",
    icon: "bath",
    order: 6,
  },
  {
    id: "btn-trash",
    categoryId: "cat-life",
    title: "ゴミの日",
    answer: "燃えるゴミは 月曜日と 木曜日です。玄関に 出しておいてください。",
    icon: "trash",
    order: 7,
  },

  // --- かぞく ---
  {
    id: "btn-message",
    categoryId: "cat-family",
    title: "家族からのメッセージ",
    answer: "ゆきこです。今日は 寒いので 暖かくして 過ごしてね。夕方に 電話します。",
    icon: "message-circle",
    order: 0,
  },
  {
    id: "btn-where",
    categoryId: "cat-family",
    title: "今どこ",
    answer: "ゆきこさんは いま お仕事中です。夕方には 帰ってきます。",
    icon: "map-pin",
    order: 1,
  },

  // --- てんき・かいもの ---
  {
    id: "btn-weather",
    categoryId: "cat-info",
    title: "天気",
    answer: "今日は 晴れです。お昼は 暖かくなります。お出かけ 日和ですよ。",
    icon: "sun",
    order: 0,
  },
  {
    id: "btn-shopping",
    categoryId: "cat-info",
    title: "買い物予定",
    answer: "買うものは 牛乳と パンと たまごです。メモを 冷蔵庫に 貼ってあります。",
    icon: "shopping-cart",
    order: 1,
  },
];

/* -------------------------------------------------------------------------- */
/* 機能②: 見守り対象者モックデータ                                            */
/* -------------------------------------------------------------------------- */

/** 自宅の基準座標（東京・上野周辺のダミー） */
const HOME_A = { lat: 35.7148, lng: 139.7745 };
const HOME_B = { lat: 35.6586, lng: 139.7454 };
const HOME_C = { lat: 35.6895, lng: 139.6917 };

/**
 * 指定した自宅周辺の 1 日分ダミールートを生成する。
 * `seed` で散らばり方を変える。日付は today からの相対で決める。
 */
function makeRoute(
  home: { lat: number; lng: number },
  daysAgo: number,
  seed: number,
): DailyRoute {
  const day = new Date();
  day.setDate(day.getDate() - daysAgo);
  day.setHours(9, 0, 0, 0);

  const points: LocationSample[] = [];
  const steps = 8;
  // 円弧を描くように散歩ルートを作る（決定的）
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2 + seed;
    const radius = 0.004 * (0.4 + (i % 4) / 4); // 緯度経度スケールの見た目調整
    const t = new Date(day);
    t.setMinutes(t.getMinutes() + i * 12);
    points.push({
      lat: home.lat + Math.sin(angle) * radius,
      lng: home.lng + Math.cos(angle) * radius * 1.2,
      timestamp: t.toISOString(),
    });
  }
  // 最後は自宅へ戻る
  const back = new Date(day);
  back.setMinutes(back.getMinutes() + steps * 12);
  points.push({ ...home, timestamp: back.toISOString() });

  return {
    date: day.toISOString().slice(0, 10),
    points,
    walkingMinutes: 24 + (seed % 3) * 8,
    distanceMeters: 1200 + (seed % 4) * 350,
  };
}

function makeRoutes(home: { lat: number; lng: number }, seedBase: number): DailyRoute[] {
  // 直近 7 日分
  return Array.from({ length: 7 }, (_, i) => makeRoute(home, 6 - i, seedBase + i));
}

export function makeInitialWatchedPersons(): WatchedPerson[] {
  const now = new Date().toISOString();
  return [
    {
      id: "person-a",
      name: "田中 花子",
      current: { ...HOME_A, timestamp: now },
      geofence: { center: HOME_A, radiusMeters: 100 },
      status: "home",
      routes: makeRoutes(HOME_A, 1),
    },
    {
      id: "person-b",
      name: "佐藤 太郎",
      current: { lat: HOME_B.lat + 0.006, lng: HOME_B.lng + 0.004, timestamp: now },
      geofence: { center: HOME_B, radiusMeters: 100 },
      status: "away",
      routes: makeRoutes(HOME_B, 3),
    },
    {
      id: "person-c",
      name: "鈴木 みどり",
      current: { ...HOME_C, timestamp: now },
      geofence: { center: HOME_C, radiusMeters: 100 },
      status: "home",
      routes: makeRoutes(HOME_C, 5),
    },
  ];
}
