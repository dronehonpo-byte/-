/**
 * 書き出し（§4.10）。画像＋SVGオーバーレイを合成して PNG / PDF 化。
 * ブラウザ専用（DOM API 使用）。
 */

/** コンテナ内の <img> と <svg> を実寸キャンバスに合成 */
export async function compositeToCanvas(container: HTMLElement): Promise<HTMLCanvasElement> {
  const img = container.querySelector("img");
  const svg = container.querySelector("svg");
  if (!img) throw new Error("画像が見つかりません");

  const w = img.naturalWidth || img.clientWidth;
  const h = img.naturalHeight || img.clientHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d コンテキスト取得失敗");

  ctx.drawImage(img, 0, 0, w, h);

  if (svg) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    await new Promise<void>((resolve, reject) => {
      const overlay = new Image();
      overlay.onload = () => {
        ctx.drawImage(overlay, 0, 0, w, h);
        resolve();
      };
      overlay.onerror = () => reject(new Error("オーバーレイの描画に失敗"));
      overlay.src = svgUrl;
    });
  }

  return canvas;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportPng(container: HTMLElement, filename = "violin-score.png") {
  const canvas = await compositeToCanvas(container);
  triggerDownload(canvas.toDataURL("image/png"), filename);
}

export async function exportPdf(container: HTMLElement, filename = "violin-score.pdf") {
  const canvas = await compositeToCanvas(container);
  const { jsPDF } = await import("jspdf");
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}
