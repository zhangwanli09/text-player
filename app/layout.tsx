import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 配置 Google 字体：Geist 无衬线体和等宽体，通过 CSS 变量注入
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 页面元数据：标题、描述、PWA 配置
export const metadata: Metadata = {
  title: "TextPlayer - 文本播放器",
  description: "粘贴文本或 URL，用自然的声音播放",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TextPlayer",
  },
  // 禁止自动检测电话号码
  formatDetection: {
    telephone: false,
  },
};

/**
 * 根布局组件
 * 设置 HTML 语言为中文，应用字体变量，配置深色/浅色模式背景色
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
