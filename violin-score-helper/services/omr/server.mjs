/**
 * Audiveris OMR ラッパー HTTP サービス
 *
 * 役割: スキャン(PDF/PNG/JPEG)を受け取り、Audiveris(OSS)で MusicXML を生成して返す。
 * このコンテナが「重い認識処理」を担当し、Next.js側(app/api/omr)は転送＋変換のみ。
 *
 * 契約:
 *   POST /omr  (multipart/form-data, field "file")
 *     → 200 { musicXml: string, width: number, height: number, pageImage: string(dataURL) }
 *     → 4xx/5xx { error: string }
 *   GET /health → 200 "ok"
 *
 * 座標の整合性のため、PDFは 300dpi で PNG にラスタライズし、
 * その **同じPNG** を「認識入力」かつ「プレビュー画像」として使う
 * （＝MusicXML座標換算の基準ピクセルと、画面表示のピクセルを一致させる）。
 */

import express from "express";
import multer from "multer";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import imageSize from "image-size";

const PORT = process.env.PORT || 8080;
const AUDIVERIS_BIN = process.env.AUDIVERIS_BIN || "/opt/audiveris/bin/Audiveris";
const RASTER_DPI = Number(process.env.RASTER_DPI || 300);

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

/** 子プロセスを実行し、終了を待つ */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, opts);
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 500)}`)),
    );
  });
}

/** PDF の1ページ目を 300dpi で PNG 化（poppler の pdftoppm を使用） */
async function pdfToPng(pdfPath, outPrefix) {
  // pdftoppm -png -r 300 -f 1 -l 1 input.pdf outPrefix  → outPrefix-1.png など
  await run("pdftoppm", ["-png", "-r", String(RASTER_DPI), "-f", "1", "-l", "1", pdfPath, outPrefix]);
  const dir = outPrefix.substring(0, outPrefix.lastIndexOf("/"));
  const base = outPrefix.substring(outPrefix.lastIndexOf("/") + 1);
  const files = (await readdir(dir)).filter((f) => f.startsWith(base) && f.endsWith(".png"));
  if (!files.length) throw new Error("PDFのPNG変換に失敗しました。");
  return join(dir, files.sort()[0]);
}

/** Audiveris をバッチ実行して MusicXML(非圧縮).xml を得る */
async function runAudiveris(inputImagePath, outDir) {
  await run(AUDIVERIS_BIN, [
    "-batch",
    "-export",
    // .mxl(zip) ではなく素の .xml を出力させる
    "-option",
    "org.audiveris.omr.sheet.BookManager.useCompression=false",
    "-output",
    outDir,
    inputImagePath,
  ]);
  // 出力ディレクトリ配下から .xml を探す（Audiverisはサブフォルダを作る）
  const found = await findFile(outDir, (f) => f.endsWith(".xml"));
  if (!found) throw new Error("Audiveris が MusicXML を生成しませんでした。");
  return found;
}

/** ディレクトリを再帰的に走査して条件に合う最初のファイルを返す */
async function findFile(dir, pred) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await findFile(full, pred);
      if (sub) return sub;
    } else if (pred(e.name)) {
      return full;
    }
  }
  return null;
}

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.post("/omr", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file がありません。" });

  const work = await mkdtemp(join(tmpdir(), "omr-"));
  try {
    const isPdf =
      req.file.mimetype === "application/pdf" || /\.pdf$/i.test(req.file.originalname || "");

    // 入力を作業ディレクトリに保存
    const inputRaw = join(work, isPdf ? "input.pdf" : sanitizeImageName(req.file.originalname));
    await writeFile(inputRaw, req.file.buffer);

    // 認識入力＝プレビュー画像となる PNG を用意（座標整合のため同一ラスタを使う）
    let imagePath;
    if (isPdf) {
      imagePath = await pdfToPng(inputRaw, join(work, "page"));
    } else {
      imagePath = inputRaw;
    }

    // ページのピクセル寸法
    const buf = await readFile(imagePath);
    const dim = imageSize(buf);
    const width = dim.width || 0;
    const height = dim.height || 0;

    // Audiveris で認識 → MusicXML
    const outDir = join(work, "out");
    const xmlPath = await runAudiveris(imagePath, outDir);
    const musicXml = await readFile(xmlPath, "utf8");

    // プレビュー用に PNG を dataURL 化（画像がJPEGでもそのまま返す）
    const previewMime = isPdf ? "image/png" : req.file.mimetype || "image/png";
    const pageImage = `data:${previewMime};base64,${buf.toString("base64")}`;

    res.status(200).json({ musicXml, width, height, pageImage });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
});

function sanitizeImageName(name) {
  const safe = (name || "input").replace(/[^\w.-]/g, "_");
  return /\.(png|jpe?g)$/i.test(safe) ? safe : `${safe}.png`;
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OMR service listening on :${PORT} (Audiveris: ${AUDIVERIS_BIN})`);
});
