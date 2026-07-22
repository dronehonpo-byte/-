import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const lastModified = new Date();
  const routes = [
    "/",
    "/ai-shindan",
    "/legal/terms",
    "/legal/specified-commercial-transactions",
    "/legal/privacy-policy",
  ];
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified,
    changeFrequency: "monthly",
    priority: r === "/" ? 1 : 0.7,
  }));
}
