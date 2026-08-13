import type { Metadata } from "next";
import { Cinzel, Lora } from "next/font/google";
import "./globals.css";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"] });
const body = Lora({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Through the Ages — Strategy Prototype",
  description: "A turn-based historical strategy game of exploration, research, city building, and tactical conquest.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
