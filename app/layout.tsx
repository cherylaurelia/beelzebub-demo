import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Beelzebub decoys vs real clients",
  description:
    "redis-cli hangs and mysql fails at the greeting against two shipped Beelzebub decoys. A config-only fix keeps the session going so it is recorded.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${mono.variable} ${syne.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
