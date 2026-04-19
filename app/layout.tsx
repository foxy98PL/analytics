import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { SideNav } from "@/components/SideNav";
import "./globals.css";

const displaySans = Space_Grotesk({
  variable: "--font-display-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XEN BURN ANALytics",
  description: "XEN token analytics — price history and burn insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displaySans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0d0d0f] text-zinc-100">
        <div className="enterprise-shell relative min-h-screen lg:flex">
          <div className="relative z-10 lg:sticky lg:top-0 lg:h-screen lg:shrink-0">
            <SideNav />
          </div>
          <div className="relative z-10 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
