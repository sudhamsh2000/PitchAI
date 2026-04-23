import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PITCHAI – AI Voice NABC Pitch Coach",
  description:
    "Practice startup pitches with voice, NABC structure, and investor-grade feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased font-sans`}
      >
        {children}
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[10px] font-medium tracking-wide text-zinc-600 backdrop-blur dark:border-white/12 dark:bg-[rgba(8,12,19,0.82)] dark:text-zinc-400">
          A product of <span className="text-zinc-800 dark:text-zinc-200">Smash TECH</span>
        </div>
      </body>
    </html>
  );
}
