import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';

export const metadata: Metadata = {
  title: 'Simuni — Field Sales & Delivery Console',
  description: 'Enterprise logistics command center for Ethiopian businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-bg text-text min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-7">
          {children}
        </main>
      </body>
    </html>
  );
}
