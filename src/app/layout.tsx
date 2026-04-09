import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeSimulator · 中式人生模拟器",
  description: "欢迎页 + 人生成长详情 · 技能点与流式叙事",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
