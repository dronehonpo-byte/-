#!/usr/bin/env node
/**
 * OMR 精度チェック用スクリプト（要件定義書 §2 / プロンプト §2 の「確認ログ」）
 *
 * 提供4曲などの楽譜画像を実APIに通し、
 *   ・音高/オクターブ/小節index/符頭bbox/記載指番号/ローマ数字
 * がどの程度取れるかを一覧ログで出力する。★モック不使用（実APIのみ）。
 *
 * 使い方:
 *   1) 開発サーバーを起動:  npm run dev
 *   2) 別ターミナルで:       node scripts/omr-check.mjs ./samples/reading.jpg [...別の画像]
 *
 * 環境変数:
 *   OMR_ENDPOINT  省略時 http://localhost:3000/api/omr
 *   （APIキーはサーバー側 .env.local の ANTHROPIC_API_KEY を使用）
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const ENDPOINT = process.env.OMR_ENDPOINT || "http://localhost:3000/api/omr";

/** PNG / JPEG のヘッダから画像の実寸(px)を読む（依存ライブラリなし） */
function imageSize(buf) {
  // PNG: 8byte signature の後、IHDR に width/height(big-endian)
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: SOFn マーカー(0xC0..0xCF, ただし C4/C8/CC 除く)を走査
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length) {
      if (buf[off] !== 0xff) {
        off++;
        continue;
      }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      off += 2 + len;
    }
  }
  return { width: 0, height: 0 };
}

async function checkOne(path) {
  const buf = await readFile(path);
  const { width, height } = imageSize(buf);
  const ext = path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  const fd = new FormData();
  fd.append("image", new Blob([buf], { type: ext }), basename(path));
  fd.append("width", String(width));
  fd.append("height", String(height));

  console.log(`\n===== ${basename(path)}  (${width}x${height}px) =====`);
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, { method: "POST", body: fd });
  const data = await res.json();
  const ms = Date.now() - t0;

  if (!res.ok) {
    console.error(`  ✗ 失敗 (${res.status}): ${data.error ?? JSON.stringify(data)}`);
    return;
  }

  const notes = data.notes ?? [];
  console.log(`  小節数: ${data.measureCount ?? "?"} / 音符数: ${notes.length} / モデル: ${data.meta?.model} / ${ms}ms`);
  console.log("  idx  pitch  meas  finger roman  bbox(x,y,w,h)");
  notes.forEach((n, i) => {
    const b = n.bbox ?? {};
    const fin = n.writtenFinger ?? "-";
    const rom = n.writtenRoman ?? "-";
    console.log(
      `  ${String(i).padStart(3)}  ${String(n.pitch + n.octave).padEnd(6)} ${String(n.measureIndex).padStart(4)}  ${String(fin).padStart(4)}  ${String(rom).padEnd(4)}  (${b.x},${b.y},${b.w},${b.h})`,
    );
  });
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("使い方: node scripts/omr-check.mjs <画像パス> [<画像パス> ...]");
  process.exit(1);
}
for (const p of args) {
  try {
    await checkOne(p);
  } catch (e) {
    console.error(`  ✗ ${p}: ${e.message}`);
  }
}
