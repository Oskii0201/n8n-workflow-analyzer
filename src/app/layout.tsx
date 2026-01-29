import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import { AuthProvider } from "@/src/contexts/AuthContext";

export const metadata: Metadata = {
    title: 'N8N Workflow Analyzer',
    description: 'Find out where your variables are used in your N8N workflows'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
