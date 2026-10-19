import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";
import { HighlightProvider } from "@/components/providers/highlight";

const uiFont = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const figuresFont = IBM_Plex_Mono({
  variable: "--font-figures",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`dark ${uiFont.variable} ${figuresFont.variable} h-full antialiased`}
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
