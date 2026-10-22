import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plexSans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "OncoSIM · Unified Cancer Systems Biology",
  description:
    "A computational biology platform that fuses genomic sequencing data and mechanistic models into a unified four-leg cure framework — driving precision-medicine decisions across debulking, anti-reseeding, resistance anticipation, and immune cleanup of dormant disease.",
  keywords: [
    "computational biology",
    "cancer systems biology",
    "precision medicine",
    "KRAS",
    "PROTAC",
    "neoantigen",
    "four-leg cure framework",
    "genomic sequencing",
    "HLA binding",
    "organotropic delivery",
  ],
  authors: [{ name: "OncoSIM Lab" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "OncoSIM · Unified Cancer Systems Biology",
    description:
      "Genomic sequencing + computational models → unified cancer behavior → precision medicine.",
    siteName: "OncoSIM",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plexSans.variable} ${plexMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
