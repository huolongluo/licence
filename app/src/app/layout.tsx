import type { Metadata } from "next";
import { Fraunces, Outfit, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Outfit({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Licence — TrueForge stops before rollback",
  description:
    "A Harbor Pay incident agent on TrueForge. It reaches MCP, runs diagnostics in an isolate, and waits for a human licence before anything irreversible.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <header className="wrap site-header">
          <Link href="/" className="brand">
            Lic<em>ence</em>
          </Link>
          <nav className="nav">
            <Link href="/desk">Desk</Link>
            <Link href="/how">How the harness works</Link>
          </nav>
        </header>
        {children}
        <footer className="wrap site-footer">
          <span>The Agent Harness Hackathon · TrueForge</span>
          <span>Investigate freely. Act only with a licence.</span>
        </footer>
      </body>
    </html>
  );
}
