/**
 * OMR（楽譜読み取り）用のプロンプト。
 * 撮影ムラ・傾き・手書き込みに耐えるよう、抽出対象を座標付きで明示する（§2/§5）。
 * Vision対応モデルに画像を渡し、§0合意スキーマの JSON を返させる。
 */

export const OMR_SYSTEM_PROMPT = `あなたはバイオリン楽譜（五線譜）を読み取る OMR エンジンです。
アップロードされた1ページの楽譜画像を精密に解析し、指定 JSON スキーマだけを出力します。

【抽出方針】
- 五線・符頭・加線・小節線・既存の指番号(0〜4)・ローマ数字(I/II/III/IV)・
  強弱記号(p/mf/f 等)・松葉(クレッシェンド/デクレッシェンド)・スラー/タイを検出する。
- 撮影ムラ・傾き・影・手書き込みがあっても、五線の間隔と符頭の位置から音高を推定する。
- 単音メロディ中心。まれに重音(ダブルストップ)。同時に鳴る2音は isDoubleStop=true とし相互に doubleStopWith で結ぶ。
- 音高は科学的音高表記(中央ハ=C4)。臨時記号は pitch に含める(例 "F#","Bb")。
- 座標(bbox)は画像左上原点のピクセル。符頭を囲む最小の矩形。
- 楽譜に指番号やローマ数字が"書かれていない"場合は null / 省略する。推測で埋めない。

【重要】JSON以外の文字（説明・コードフェンス）を一切出力しないこと。`;

export function buildOmrUserPrompt(imageWidth: number, imageHeight: number): string {
  return `この楽譜画像(幅${imageWidth}px, 高さ${imageHeight}px)を解析し、次の JSON を返してください。

{
  "imageWidth": number,
  "imageHeight": number,
  "measureCount": number,
  "notes": [
    {
      "id": "一意の文字列",
      "pitch": "音名(例 C, F#, Bb)",
      "octave": 整数(中央ハ=C4),
      "measureIndex": 0始まりの小節番号,
      "orderInMeasure": 小節内の時間順(0始まり),
      "bbox": { "x": number, "y": number, "w": number, "h": number },
      "writtenFinger": 0〜4 または null(楽譜に指番号がある時のみ),
      "writtenRoman": "I"|"II"|"III"|"IV" または null,
      "dynamics": ["p"|"mf"|"f"|"cresc"|"dim"|"hairpin-cresc"|"hairpin-dim" ...] または null,
      "underSlurOrTie": true/false,
      "writtenFingerBelow": true/false(指番号が符頭の下に印字されている場合 true),
      "isDoubleStop": true/false,
      "doubleStopWith": "ペア音符のid" または null
    }
  ]
}

音符は時間順(左→右, 段は上→下)に並べてください。JSON のみを出力。`;
}
