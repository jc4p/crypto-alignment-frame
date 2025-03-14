import { Inter } from "next/font/google";
import "./globals.css";
import { FrameInit } from "@/components/FrameInit";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Onchain Alignment Chart",
  description: "Discover where you align in the onchain ecosystem",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <div>
          {children}
          <FrameInit />
        </div>
      </body>
    </html>
  );
}
