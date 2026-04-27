/**
 * KUHAKU 25メニューのマスターデータ。
 * LPのサービスメニュー、料金表、AI診断の推奨ロジックから参照する。
 *
 * - price: 単位は「万円」
 * - tier: 基本料金3段階（ライト10 / スタンダード15 / プロ20）
 * - featured: 各カテゴリの星印メニュー（最推奨）
 */

export type Category = "sales" | "marketing" | "backoffice" | "document" | "hr";

export type Tier = "light" | "standard" | "pro";

export type Menu = {
  id: string;
  no: string;
  category: Category;
  name: string;
  price: number; // 万円
  tier: Tier;
  featured?: boolean;
  /** 「○○AI社員」の擬人化呼称（主要メニューのみ） */
  aiRole?: string;
  shortDescription: string;
  deliverable: string;
  completionCriteria: string;
  conditions: string;
  stack: string[];
  /** AI診断で紐付けるための業務タグ */
  tags: string[];
};

export const categories: { id: Category; label: string; emoji: string }[] = [
  { id: "sales", label: "営業", emoji: "🎯" },
  { id: "marketing", label: "マーケティング", emoji: "📣" },
  { id: "backoffice", label: "事務・バックオフィス", emoji: "📋" },
  { id: "document", label: "書類・ドキュメント", emoji: "📄" },
  { id: "hr", label: "人事・経営管理", emoji: "👥" },
];

export const tierMeta: Record<
  Tier,
  { label: string; price: number; note: string; leadtime: string; color: string }
> = {
  light: {
    label: "ライト",
    price: 10,
    note: "GAS中心の自動化",
    leadtime: "7-10営業日",
    color: "#4D5F8A",
  },
  standard: {
    label: "スタンダード",
    price: 15,
    note: "複数API連携の本格実装",
    leadtime: "10-14営業日",
    color: "#0A1F44",
  },
  pro: {
    label: "プロ",
    price: 20,
    note: "Webアプリ・AI高度実装",
    leadtime: "14-18営業日",
    color: "#C9A94B",
  },
};

export const menus: Menu[] = [
  // ===== 営業 =====
  {
    id: "S-1",
    no: "S-1",
    category: "sales",
    name: "営業リスト自動生成",
    price: 15,
    tier: "standard",
    featured: true,
    aiRole: "営業AI社員",
    shortDescription:
      "条件指定で100-500社の企業リストを自動生成。Sheets連携で即使える。",
    deliverable:
      "条件指定で企業リスト100-500社を自動生成するNode.jsツール＋Sheets連携＋操作マニュアル",
    completionCriteria:
      "指定条件でテスト実行し、100社以上のリスト出力成功＋顧客確認OK",
    conditions:
      "Google Workspace／使用APIまたはスクレイピング対象サイトの利用許可",
    stack: ["Node.js", "Google Sheets API", "Claude"],
    tags: ["営業"],
  },
  {
    id: "S-2",
    no: "S-2",
    category: "sales",
    name: "パーソナライズ営業メール",
    price: 20,
    tier: "pro",
    shortDescription:
      "企業を自動調査し、1社ごとに刺さるメールを生成。10倍返信率を狙う。",
    deliverable:
      "企業調査→個別最適化メール生成ツール＋5テンプレート＋マニュアル",
    completionCriteria:
      "テスト企業10社向けメール生成で顧客「そのまま送れる」判定が7通以上",
    conditions: "Google Workspace／Claude APIキー／過去送信メール20通",
    stack: ["Claude", "Google Workspace", "Node.js"],
    tags: ["営業", "メール"],
  },
  {
    id: "S-3",
    no: "S-3",
    category: "sales",
    name: "商談議事録・次アクション",
    price: 15,
    tier: "standard",
    shortDescription:
      "商談録音をアップするだけで、要約とToDoが5分以内に生成される。",
    deliverable:
      "音声アップ→要約＋ToDo抽出Webツール＋Slack通知連携＋マニュアル",
    completionCriteria:
      "30分の商談録音からToDo抽出を5分以内完了、ToDo精度8割以上",
    conditions: "Whisper＋Claude APIキー／サンプル商談録音3件",
    stack: ["Whisper", "Claude", "Next.js"],
    tags: ["営業", "議事録"],
  },
  {
    id: "S-4",
    no: "S-4",
    category: "sales",
    name: "失注分析レポート",
    price: 10,
    tier: "light",
    shortDescription:
      "失注データを入力すると、共通パターンと改善案が月次で自動集計される。",
    deliverable:
      "商談データ入力→分析レポート自動生成スプレッドシート＋マニュアル",
    completionCriteria:
      "過去失注10件データ入力で分析レポート自動出力、顧客確認OK",
    conditions: "Google Sheets／過去失注データ10件以上",
    stack: ["GAS", "Google Sheets", "Claude"],
    tags: ["営業"],
  },
  {
    id: "S-5",
    no: "S-5",
    category: "sales",
    name: "問い合わせ自動振り分け",
    price: 15,
    tier: "standard",
    shortDescription:
      "受信したメールを内容判別し、担当者アサインと一次返信を自動で。",
    deliverable:
      "メール判別→担当者アサイン→一次返信GASコード＋マニュアル",
    completionCriteria:
      "指定10通のテストメールで正しい担当者振り分け・一次返信生成が成功",
    conditions: "Google Workspace／担当者リスト＋振り分けルール定義",
    stack: ["GAS", "Gmail API", "Claude"],
    tags: ["営業", "メール"],
  },

  // ===== マーケティング =====
  {
    id: "M-1",
    no: "M-1",
    category: "marketing",
    name: "SNS投稿量産システム",
    price: 15,
    tier: "standard",
    featured: true,
    aiRole: "マーケAI社員",
    shortDescription:
      "1つのネタから X / IG / TikTok 用の投稿案を月30本分、自動生成。",
    deliverable:
      "1ネタから複数SNS用に変換するNode.jsツール＋Sheets連携＋テンプレ5種＋マニュアル",
    completionCriteria:
      "1テーマからX/IG/TikTok用の月30本分投稿案を生成、顧客確認OK",
    conditions: "Claude APIキー／過去投稿サンプル10件",
    stack: ["Node.js", "Claude", "Google Sheets"],
    tags: ["SNS", "マーケ"],
  },
  {
    id: "M-2",
    no: "M-2",
    category: "marketing",
    name: "ブログSEO自動執筆",
    price: 15,
    tier: "standard",
    shortDescription:
      "キーワードを入れるだけで、3,000字以上のSEO記事ドラフトが完成。",
    deliverable:
      "キーワード→記事構成→3000字以上執筆ツール＋SEO最適化チェック＋マニュアル",
    completionCriteria:
      "指定キーワード3つで記事生成、顧客「公開可能」判定",
    conditions: "Claude APIキー／過去記事3本（トンマナ学習用）",
    stack: ["Claude", "Next.js", "SEO API"],
    tags: ["マーケ"],
  },
  {
    id: "M-3",
    no: "M-3",
    category: "marketing",
    name: "動画・リール台本生成",
    price: 10,
    tier: "light",
    shortDescription:
      "テーマを渡すと、5パターンのリール用台本を自動で書き上げる。",
    deliverable:
      "テーマ→台本自動生成GASツール＋5パターン＋マニュアル",
    completionCriteria: "3テーマで台本生成、顧客「撮影可能」判定",
    conditions: "Google Workspace／Claude APIキー",
    stack: ["GAS", "Claude"],
    tags: ["SNS", "マーケ"],
  },
  {
    id: "M-4",
    no: "M-4",
    category: "marketing",
    name: "広告クリエイティブ量産",
    price: 20,
    tier: "pro",
    shortDescription:
      "1商品から5パターンのテキスト＋画像広告を自動生成し、テスト配信を加速。",
    deliverable:
      "1広告→複数パターン（テキスト＋画像）自動生成Webツール＋マニュアル",
    completionCriteria:
      "1商品で5パターンのクリエイティブ生成、顧客「広告に使える」判定3パターン以上",
    conditions: "Claude＋画像生成APIキー／ブランドガイドライン",
    stack: ["Claude", "画像生成API", "Next.js"],
    tags: ["マーケ"],
  },
  {
    id: "M-5",
    no: "M-5",
    category: "marketing",
    name: "メルマガ・LINE代筆",
    price: 10,
    tier: "light",
    shortDescription:
      "属性別セグメントごとに、送る価値のある文章を自動で書き分ける。",
    deliverable:
      "属性別セグメント→文章自動生成スプレッドシート＋マニュアル",
    completionCriteria:
      "3セグメント×5テンプレで配信文章自動生成、顧客確認OK",
    conditions: "Google Workspace／Claude APIキー／顧客セグメント定義",
    stack: ["GAS", "Claude"],
    tags: ["マーケ", "メール"],
  },

  // ===== 事務・バックオフィス =====
  {
    id: "B-1",
    no: "B-1",
    category: "backoffice",
    name: "メール返信代筆",
    price: 15,
    tier: "standard",
    featured: true,
    aiRole: "メール代筆AI社員",
    shortDescription:
      "受信メールを解釈し、社長の口調に合わせた下書きをGmail上に自動保存。",
    deliverable:
      "Gmail受信→下書き生成GASコード＋学習プロンプト5パターン＋マニュアル",
    completionCriteria:
      "テスト10通で下書き自動生成、社長OK判定7通以上",
    conditions: "Google Workspace／Claude APIキー／過去メール50通",
    stack: ["GAS", "Gmail API", "Claude"],
    tags: ["メール"],
  },
  {
    id: "B-2",
    no: "B-2",
    category: "backoffice",
    name: "議事録・ToDo抽出",
    price: 20,
    tier: "pro",
    aiRole: "議事録AI社員",
    shortDescription:
      "会議音声をアップすると、要約＋決定事項＋ToDoがSlackに届く。",
    deliverable:
      "音声アップ→要約＋ToDo自動生成Webアプリ＋Slack連携＋マニュアル",
    completionCriteria:
      "30分録音から5分以内で要約＋ToDo出力、主要決定事項の8割以上抽出",
    conditions: "Whisper＋Claude APIキー／サンプル会議録音3件",
    stack: ["Whisper", "Claude", "Next.js", "Slack"],
    tags: ["議事録"],
  },
  {
    id: "B-3",
    no: "B-3",
    category: "backoffice",
    name: "日程調整自動化",
    price: 10,
    tier: "light",
    shortDescription:
      "メール文から候補日を抽出し、カレンダー登録と返信案までを一気通貫。",
    deliverable:
      "メール→候補日抽出→カレンダー登録→返信生成GASコード（複数人調整対応）＋マニュアル",
    completionCriteria:
      "テスト10件で候補日抽出・カレンダー登録・返信生成が正常動作",
    conditions: "Google Workspace／Googleカレンダー利用中",
    stack: ["GAS", "Google Calendar API"],
    tags: ["メール"],
  },
  {
    id: "B-4",
    no: "B-4",
    category: "backoffice",
    name: "社内FAQチャットボット",
    price: 20,
    tier: "pro",
    shortDescription:
      "社内マニュアルを学習したチャットボットが、社員の質問に出典付きで回答。",
    deliverable:
      "社内マニュアル学習型Webチャットボット（Dify）＋質問履歴ダッシュボード＋マニュアル追加手順書",
    completionCriteria:
      "想定質問20問中18問以上で正答、出典マニュアル該当箇所の表示",
    conditions: "社内マニュアル10-50ファイル／APIキー",
    stack: ["Dify", "Claude", "Next.js"],
    tags: ["その他"],
  },
  {
    id: "B-5",
    no: "B-5",
    category: "backoffice",
    name: "多言語メール翻訳",
    price: 10,
    tier: "light",
    shortDescription:
      "英中韓西の海外メールを翻訳し、業界用語辞書付きで返信下書きを生成。",
    deliverable:
      "海外メール翻訳＋返信生成GASコード（英・中・韓・西）＋専門用語辞書機能＋マニュアル",
    completionCriteria:
      "テスト10通で翻訳精度OK、返信下書き5通以上「そのまま送れる」判定",
    conditions: "Google Workspace／Claude APIキー／業界用語リスト",
    stack: ["GAS", "Claude"],
    tags: ["メール"],
  },

  // ===== 書類・ドキュメント =====
  {
    id: "D-1",
    no: "D-1",
    category: "document",
    name: "請求書・領収書データ化",
    price: 10,
    tier: "light",
    featured: true,
    aiRole: "経理AI社員",
    shortDescription:
      "紙・PDFの請求書を会計ソフト用CSVに自動変換。精度95%以上。",
    deliverable:
      "画像アップ→会計ソフト用データ変換GASツール＋CSV出力機能＋マニュアル",
    completionCriteria:
      "テスト画像20枚でデータ抽出精度95%以上、会計ソフトへのインポート成功",
    conditions: "Google Workspace／使用する会計ソフト情報／テスト画像20枚",
    stack: ["GAS", "Claude Vision"],
    tags: ["請求書"],
  },
  {
    id: "D-2",
    no: "D-2",
    category: "document",
    name: "マニュアル自動作成",
    price: 15,
    tier: "standard",
    shortDescription:
      "動画やメモを入れるだけで、作業手順書を自動で生成・更新。",
    deliverable:
      "動画/メモ→手順書自動生成Webツール＋テンプレート3種＋マニュアル",
    completionCriteria:
      "テスト動画またはメモからマニュアル1本以上完成、顧客「使用可能」判定",
    conditions: "Claude APIキー／元になる動画またはメモ",
    stack: ["Claude", "Next.js"],
    tags: ["資料作成"],
  },
  {
    id: "D-3",
    no: "D-3",
    category: "document",
    name: "契約書リスクチェック",
    price: 15,
    tier: "standard",
    shortDescription:
      "PDFの契約書から、貴社にとってのリスク条項を指摘するレポートを自動生成。",
    deliverable:
      "PDF契約書→リスク指摘レポート生成Webツール＋独自ルール反映機能＋マニュアル",
    completionCriteria:
      "テスト契約書5件でリスク指摘、顧客の法務担当が「妥当」と判定",
    conditions:
      "Claude APIキー／過去のリスク事例またはNG条項リスト10件",
    stack: ["Claude", "Next.js"],
    tags: ["資料作成"],
  },
  {
    id: "D-4",
    no: "D-4",
    category: "document",
    name: "週報・日報要約",
    price: 10,
    tier: "light",
    shortDescription:
      "Slack等のチャット履歴から、提出可能な週報を自動生成。",
    deliverable:
      "Slackなどチャット履歴→報告書自動生成Slack bot＋マニュアル",
    completionCriteria:
      "1週間分のチャット履歴から週報を自動生成、顧客「そのまま提出可能」判定",
    conditions: "Slack／Teams連携権限／Claude APIキー",
    stack: ["Slack Bolt", "Claude"],
    tags: ["資料作成"],
  },
  {
    id: "D-5",
    no: "D-5",
    category: "document",
    name: "提案書・スライド生成",
    price: 20,
    tier: "pro",
    shortDescription:
      "構成案を渡すと、Google Slidesで10枚以上のプレゼン資料が完成。",
    deliverable:
      "構成案→Google Slides自動生成ツール＋テンプレート3種＋マニュアル",
    completionCriteria:
      "構成案3つから各10枚以上のスライドを生成、顧客「プレゼン可能」判定",
    conditions:
      "Google Workspace／Claude APIキー／過去提案書サンプル3本",
    stack: ["GAS", "Google Slides API", "Claude"],
    tags: ["資料作成"],
  },

  // ===== 人事・経営管理 =====
  {
    id: "H-1",
    no: "H-1",
    category: "hr",
    name: "採用スクリーニング",
    price: 15,
    tier: "standard",
    featured: true,
    aiRole: "採用AI社員",
    shortDescription:
      "履歴書をアップすると、採用基準に沿ったスコアと評価コメントを即生成。",
    deliverable:
      "履歴書アップ→スコアリングWebツール＋評価レポート自動生成＋マニュアル",
    completionCriteria:
      "テスト履歴書20件でスコアリング、人事担当「選別判断に使える」判定",
    conditions:
      "Claude APIキー／採用基準ルール定義／過去採用判断10件",
    stack: ["Claude", "Next.js"],
    tags: ["採用"],
  },
  {
    id: "H-2",
    no: "H-2",
    category: "hr",
    name: "面接質問・評価シート生成",
    price: 10,
    tier: "light",
    shortDescription:
      "候補者情報を入れると、その人に合わせた面接質問と評価シートが出る。",
    deliverable:
      "候補者情報→質問リスト＋評価シート自動生成GASツール＋マニュアル",
    completionCriteria:
      "5候補者向けの個別質問リスト生成、面接官「使える」判定",
    conditions: "Google Workspace／Claude APIキー",
    stack: ["GAS", "Claude"],
    tags: ["採用"],
  },
  {
    id: "H-3",
    no: "H-3",
    category: "hr",
    name: "新人研修チャットボット",
    price: 20,
    tier: "pro",
    shortDescription:
      "研修資料を学習したBotが、新人の質問に24時間答える。進捗も可視化。",
    deliverable:
      "社内資料学習型Webチャットボット（Dify）＋進捗管理ダッシュボード＋マニュアル",
    completionCriteria:
      "研修想定質問30問中25問以上で正答、出典資料の表示",
    conditions: "研修マニュアル10ファイル以上／APIキー",
    stack: ["Dify", "Claude", "Next.js"],
    tags: ["採用", "その他"],
  },
  {
    id: "H-4",
    no: "H-4",
    category: "hr",
    name: "エンゲージメント分析",
    price: 20,
    tier: "pro",
    shortDescription:
      "チャットとアンケートから離職リスクを算出し、人事に週次で通知。",
    deliverable:
      "チャット／アンケート分析→離職リスクスコア算出Webツール＋週次レポート自動化＋マニュアル",
    completionCriteria:
      "3ヶ月分のデータでリスクスコア算出、人事「判断に使える」判定",
    conditions:
      "Slack/Teams/チャットデータ提供権限／アンケートデータ／Claude APIキー",
    stack: ["Claude", "Next.js", "Slack"],
    tags: ["その他"],
  },
  {
    id: "H-5",
    no: "H-5",
    category: "hr",
    name: "データ予測エンジン",
    price: 15,
    tier: "standard",
    shortDescription:
      "過去の売上データから翌月予測を生成。ダッシュボードで即確認。",
    deliverable:
      "売上データ→翌月予測Pythonスクリプト＋ダッシュボード（Streamlit等）＋マニュアル",
    completionCriteria:
      "過去12ヶ月データで予測精度±10%以内、ダッシュボード稼働",
    conditions:
      "売上データ12ヶ月分／Python実行環境またはホスティング",
    stack: ["Python", "Streamlit", "Prophet"],
    tags: ["その他"],
  },
];

/** LPの「6人のAI社員」セクションで露出する代表メニュー */
export const aiStaffMenuIds = ["S-1", "M-1", "B-1", "B-2", "D-1", "H-1"] as const;

export function getAiStaffMenus(): Menu[] {
  return aiStaffMenuIds
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is Menu => Boolean(m));
}

export function getMenu(id: string): Menu | undefined {
  return menus.find((m) => m.id === id);
}

export function getMenusByCategory(category: Category): Menu[] {
  return menus.filter((m) => m.category === category);
}
