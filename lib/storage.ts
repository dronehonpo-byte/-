import type { NoteEdits, ScoreDocument } from "@/types/score";

const DOC_KEY = "violin-score:doc";
const EDITS_PREFIX = "violin-score:edits:";
const TUTORIAL_KEY = "violin-score:tutorial-seen";

// --- 解析結果ドキュメント（sessionStorage） ---
// 画像データが大きいため sessionStorage を使う（タブ単位で保持）

export function saveDocument(doc: ScoreDocument): void {
  try {
    sessionStorage.setItem(DOC_KEY, JSON.stringify(doc));
  } catch (e) {
    console.error("ドキュメントの保存に失敗しました", e);
  }
}

export function loadDocument(): ScoreDocument | null {
  try {
    const raw = sessionStorage.getItem(DOC_KEY);
    return raw ? (JSON.parse(raw) as ScoreDocument) : null;
  } catch {
    return null;
  }
}

// --- 手動修正（localStorage、リロード後も保持） ---

export function loadEdits(docId: string): NoteEdits {
  try {
    const raw = localStorage.getItem(EDITS_PREFIX + docId);
    return raw ? (JSON.parse(raw) as NoteEdits) : {};
  } catch {
    return {};
  }
}

export function saveEdits(docId: string, edits: NoteEdits): void {
  try {
    localStorage.setItem(EDITS_PREFIX + docId, JSON.stringify(edits));
  } catch (e) {
    console.error("修正内容の保存に失敗しました", e);
  }
}

// --- チュートリアル表示済みフラグ ---

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    /* noop */
  }
}
