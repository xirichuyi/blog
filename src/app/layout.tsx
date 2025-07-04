import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import ConditionalFooter from "../components/ConditionalFooter";
import { ThemeProvider } from "../context/ThemeContext";
import { ChatProvider } from "../context/ChatContext";
import ChatAssistant from "../components/ChatAssistant";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cyrus | Personal Blog",
  description: "Professional blog by Cyrus featuring insights and expertise",
  keywords: ["blog", "professional", "business", "Cyrus"],
  authors: [{ name: "Cyrus" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased dark:bg-apple-gray-900 dark:text-white`} suppressHydrationWarning>
        <ThemeProvider>
          <ChatProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <ConditionalFooter />
            </div>
            {/* 全局AI聊天助手 */}
            <ChatAssistant />
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
