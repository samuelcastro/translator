import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { TranslationsProvider } from "@/components/translations-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sully.ai - Medical Interpreter",
  description:
    "Sully.ai's Medical Interpreter facilitates real-time communication between English-speaking clinicians and Spanish-speaking patients with AI-powered translation.",
  authors: [{ name: siteConfig.author, url: siteConfig.links.twitter }],
  creator: siteConfig.author,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    images: "/opengraph-image.png",
  },
  icons: {
    icon: "/favicon.ico",
  },
  keywords: [
    "Medical Interpreter",
    "Healthcare Translation",
    "Spanish Translation",
    "Patient Communication",
    "Medical AI",
    "Sully.ai",
    "OpenAI Realtime API",
    "OpenAI WebRTC",
    "Voice AI",
    "Voice AI components",
    "Next.js",
    "React",
    "Tailwind CSS",
    "Framer Motion",
    "TypeScript",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-dvh bg-background font-sans antialiased",
          geistSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TranslationsProvider>
            <div className="relative flex min-h-dvh flex-col bg-background items-center">
              <Header />
              <main className="flex flex-1 justify-center items-start p-4">
                {children}
              </main>
            </div>
            <Toaster />
          </TranslationsProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
