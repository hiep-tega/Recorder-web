import { Rajdhani, Space_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata = {
  title: "Game Recorder",
  description: "Capture game sessions and manage saved recordings",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
