import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "Blast-Avisena Enterprise",
  description: "Blast-Avisena Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
