/**
 * プラットフォーム解決レイヤ。
 *
 * アプリ全体はここから `speech` / `location` / `storage` を取得する。
 * 各サービスの Web 実装をここに束ねているため、
 * RN/Expo 移行時は **このファイルの import 先だけ** を
 * `*.native.ts` に差し替えれば、呼び出し側は一切変更不要。
 *
 * 例（移行後）:
 *   import { nativeSpeechService } from "./speech.native";
 *   export const speech = nativeSpeechService;
 *
 * より本格的には Metro/webpack の platform-extension
 * （speech.web.ts / speech.native.ts の自動解決）に寄せられるが、
 * デモでは明示的な集約で意図を分かりやすくしている。
 */
import { webSpeechService } from "./speech.web";
import { webLocationService } from "./location.web";
import { webStorageService } from "./storage.web";

import type { SpeechService } from "./speech";
import type { LocationService } from "./location";
import type { StorageService } from "./storage";

export const speech: SpeechService = webSpeechService;
export const location: LocationService = webLocationService;
export const storage: StorageService = webStorageService;

export type { SpeechService, SpeakOptions } from "./speech";
export type { LocationService } from "./location";
export type { StorageService } from "./storage";
