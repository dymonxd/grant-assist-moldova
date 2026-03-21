import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrantAssist Moldova",
  description: "Descopera granturile disponibile pentru afacerea ta",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
            <span className="text-lg font-bold tracking-tight">
              GrantAssist Moldova
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border">
          <div className="text-sm text-muted-foreground text-center py-4 px-4">
            &copy; {new Date().getFullYear()} GrantAssist Moldova
          </div>
        </footer>
      </body>
    </html>
  );
}
