# Sounds（音声素材の差し替え方法）

現在は素材未選定のため、以下のフォールバックで動作しています。

- **SE**: システムサウンド（`AudioServicesPlaySystemSound`）
- **音声案内**: `AVSpeechSynthesizer` による日本語読み上げ
- **BGM**: 無音（ファイルが無い場合は再生スキップ）

## 差し替え手順

このディレクトリに以下のファイル名で mp3 を配置し、Xcodeのターゲットに追加するだけで
`AudioManager` が自動的にファイル再生へ切り替わります。コード修正は不要です。

| ファイル名 | 用途 |
|---|---|
| `bgm_main.mp3` | メインBGM（ループ） |
| `se_tap.mp3` | タップ時 |
| `se_drag_start.mp3` | ドラッグ開始 |
| `se_snap.mp3` | スナップ（パチッ） |
| `se_swipe.mp3` | スワイプ・なぞる（シャカシャカ） |
| `se_gargle.mp3` | うがい（ガラガラ） |
| `se_eat.mp3` | 食べる（パクッ/もぐもぐ） |
| `se_clear.mp3` | 1場面クリア（チリン） |
| `se_fanfare.mp3` | カテゴリ完了（ファンファーレ） |
| `se_special.mp3` | 全セットクリア特別演出 |

音声案内は `voice_<キー>.mp3` を配置し、`AudioManager.speak(_:voiceFileName:)` の
`voiceFileName` 引数で指定すると収録音声を再生します。

## フリー素材候補

- 効果音ラボ: https://soundeffect-lab.info
- 魔王魂: https://maoudamashii.jokersounds.com
