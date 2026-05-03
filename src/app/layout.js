import { Geist, Geist_Mono } from "next/font/google";
import { BundleProvider } from "@/components/BundleContext";
import Header from "@/components/Header";
import BundleDrawer from "@/components/BundleDrawer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DailyCardBin",
  description: "Gamified, Tinder-style swiping deck sports card store",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 pt-20">
        <BundleProvider>
          <Header />
          {children}
          <BundleDrawer />
        </BundleProvider>
      </body>
    </html>
  );
}
