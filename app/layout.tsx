import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { FontSizeProvider } from "@/components/FontSizer";
import QueryProvider from "@/components/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Судалгаа — mindX",
  description: "Олон нийтийн судалгаа бөглөх сайт",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <FontSizeProvider>{children}</FontSizeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
