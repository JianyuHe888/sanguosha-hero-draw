import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "武将台｜三国杀面杀选将器";
const description =
  "从 166 张实体身份局武将牌中按系列和年份筛选，随机抽取并全屏查看完整原始卡面。";

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
          url: `${origin}/og-v2.png`,
          width: 1536,
          height: 1024,
          alt: "武将台——定下牌池，抽将开战",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og-v2.png`],
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
