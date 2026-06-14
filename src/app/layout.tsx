import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";
import { HighlightProvider } from "@/components/providers/highlight";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyOS",
  description: "Personal finance command center by Apalym",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <HighlightProvider>
              <AppProviders>{children}</AppProviders>
            </HighlightProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
