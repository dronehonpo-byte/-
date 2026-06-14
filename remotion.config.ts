import { Config } from "@remotion/cli/config";

// 1080x1920 vertical, H.264 MP4
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);

// Quality knobs for a clean, premium look.
Config.setCrf(18);

// Embedded base64 fonts can take a moment to parse in freshly-opened render
// tabs; give delayRender() generous headroom so font loading never times out.
Config.setDelayRenderTimeoutInMilliseconds(120000);
