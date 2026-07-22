import type { Metadata } from "next";
import { headers } from "next/headers";
import heroData from "./data/heroes.json";
import "./globals.css";

const title = "面杀助手｜三国杀面杀选将器";
const description =
  `按势力、系列与品质筛选 ${heroData.length} 名三国杀移动版身份局武将，随机抽取、名字搜索，并查看势力、体力与现行技能。`;

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol =
    incoming.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "zh_CN",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1536,
          height: 1024,
          alt: "面杀助手——定下牌池，抽将开战",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
