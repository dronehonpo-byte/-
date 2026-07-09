"use client";

/** 初回起動チュートリアル（§4.11）。初回自動表示＋ヘルプからいつでも再表示。 */

const STEPS = [
  { icon: "①", title: "楽譜をアップロード", body: "スマホ撮影またはスキャン画像を1ページ選びます。" },
  { icon: "②", title: "自動で色分け・運指", body: "使う弦の色・指番号・半音マーク(^/v)が自動で付きます。" },
  { icon: "③", title: "タップで手直し", body: "判定が違うときは音符をタップして弦・指を修正できます。" },
  { icon: "④", title: "音源で練習", body: "テンポを落として一緒に弾けます（練習確認用の簡易音源）。" },
  { icon: "⑤", title: "保存", body: "色付きの楽譜を PNG / PDF で書き出せます。" },
];

interface Props {
  onClose: () => void;
}

export default function Tutorial({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-1 text-lg font-bold">使い方ガイド</h2>
        <p className="mb-4 text-sm text-neutral-500">
          アップロード → 判定 → 修正 → 音源 → 保存 の流れで使います。
        </p>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.icon} className="flex gap-3">
              <span className="text-xl font-bold text-neutral-400">{s.icon}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-neutral-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-neutral-900 py-3 text-sm font-semibold text-white"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
