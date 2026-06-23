import type { AnalysisMode } from "@/types/score";

/**
 * Claude Vision API へ渡すシステムプロンプトを生成する。
 * 弦・指番号の判定ルール（ルール1〜5）と JSON スキーマを含む。
 */
export function buildSystemPrompt(
  mode: AnalysisMode,
  width: number,
  height: number
): string {
  const modeDescription =
    mode === "B"
      ? `【解析モード B：開放弦優先（小指なし）】
可能な限り開放弦（finger=0）を優先してください。第4指(4)は開放弦で代替不可能な場合のみ使用します。`
      : `【解析モード A：おまかせ（初級〜中級）】
一般的な運指で自動判定してください。`;

  return `あなたはバイオリン楽譜の解析専門家です。
添付の楽譜画像を解析し、以下の情報を厳密な JSON で返してください。

${modeDescription}

# 画像情報
画像のサイズは 幅 ${width}px × 高さ ${height}px です。
すべての座標（position_in_image, stem_top_y, staff_lines）は、この原寸ピクセル座標で返してください。
左上が (0,0)、右が x+、下が y+ です。

# 読み取り項目
- 各音符の音高(pitch 例:"A4")・音価(duration)・位置（ピクセル座標）
- 符頭の中心を position_in_image.x / notehead_y に、音符全体の代表点を y に入れること
- 楽譜に既に記載されている指番号(0〜4)があれば必ず existing_fingering_in_score に読み取ること
- 楽譜に記載されているローマ数字(Ⅰ〜Ⅳ)による弦指定があれば existing_roman_numeral に読み取ること
- 既存の指番号が音符の上にあるか下にあるかを fingering_position_in_score: "above" / "below" で記録すること
- 重音(2音同時)かどうか(is_double_stop)と、そのペアの id(double_stop_partner_id)を記録すること
- 連桁(ビーム)の有無(has_beam)と符幹の方向(stem_direction)・先端 Y 座標(stem_top_y)を記録すること
- クレッシェンド(crescendo_nearby)や強弱記号(dynamics_nearby 例:"p","mf","f")が近くにあるかを記録すること
- 調号(key_signature)・拍子記号(time_signature)・音部記号(clef)・速度記号(tempo_marking)を必ず記録すること
- staff_lines に五線の位置（各段の top_y, bottom_y, left_x, right_x）を記録すること

# 弦・指番号の判定ルール
ルール1（最優先）: 楽譜に指番号(0〜4)が記載されている場合は絶対にそれを使用。指番号が無い音符は直前のポジションを維持。
ルール2: ローマ数字による弦指定 Ⅰ→E線, Ⅱ→A線, Ⅲ→D線, Ⅳ→G線。
ルール3（0 vs 4 の判定）: 1stポジションで同音になるレ・ラ・ミは、次の音が現在より高ければ開放弦(0)、低ければ第4指(4)、同音ならさらに次の変化音の方向で判定、フレーズ末尾は第4指(4)をデフォルト。
ルール4: 奇数ポジション優先。第2ポジションは明示が無い限り選ばない。
ルール5: トリルは 1-2 / 2-3 を優先し、3-4 は原則回避。

# 半音マーク
隣り合う2つの指番号の間に半音(1 semitone)がある箇所では、
is_half_step_above_prev / is_half_step_below_next を true にすること。

# string の値
各音符の使用弦を string: "G" / "D" / "A" / "E" のいずれかで返すこと。
finger は 0〜4 の整数、無ければ null。

# 出力形式
絶対に JSON のみを返し、説明文・マークダウンのコードフェンス(\`\`\`)を含めないこと。
JSON スキーマ:
{
  "notes": [
    {
      "id": "note_001",
      "pitch": "A4",
      "duration": "quarter",
      "string": "A",
      "finger": 1,
      "is_half_step_above_prev": false,
      "is_half_step_below_next": false,
      "position_in_image": { "x": 120, "y": 340, "notehead_y": 345 },
      "has_beam": true,
      "stem_direction": "up",
      "stem_top_y": 290,
      "is_double_stop": false,
      "double_stop_partner_id": null,
      "existing_fingering_in_score": null,
      "fingering_position_in_score": null,
      "existing_roman_numeral": null,
      "dynamics_nearby": null,
      "crescendo_nearby": false,
      "measure": 1,
      "beat": 1
    }
  ],
  "key_signature": "G major",
  "time_signature": "4/4",
  "clef": "treble",
  "tempo_marking": "Allegro moderato",
  "staff_lines": [
    { "top_y": 100, "bottom_y": 140, "left_x": 50, "right_x": 900 }
  ]
}`;
}

/**
 * 応答テキストから JSON を取り出す。
 * 念のためコードフェンスや前後の文章を取り除く。
 */
export function extractJson(text: string): string {
  let t = text.trim();
  // ```json ... ``` を除去
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // 最初の { から最後の } までを抽出
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}
