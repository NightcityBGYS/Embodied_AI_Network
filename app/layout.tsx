import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "具身智能科研对象池",
  description:
    "用于管理具身智能科研对象名单、工作状态和飞书调研文档入口的内部协作平台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
