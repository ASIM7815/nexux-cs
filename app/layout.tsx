import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "NEXUS CYPHER - Capture the Flag | ISL Engineering College",
  description: "Join NEXUS CYPHER CTF competition hosted by Nexus Vyoma at ISL Engineering College. Test your skills in Web Exploitation, Cryptography, and Forensics. Identify vulnerabilities, find the flaws, compete for highest score.",
  keywords: ["CTF", "Capture the Flag", "Cybersecurity", "Hacking", "Web Exploitation", "Cryptography", "Forensics", "ISL Engineering College", "Nexus Vyoma", "NEXUS CYPHER"],
  authors: [{ name: "Nexus Vyoma - ISL Engineering College" }],
  openGraph: {
    title: "NEXUS CYPHER - Capture the Flag Competition",
    description: "Identify vulnerabilities, find the flaws, compete for highest score. Join the ultimate CTF challenge.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0E27",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
