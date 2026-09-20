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
      <body className="antialiased bg-bg text-text min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-7">
          {children}
        </main>
      </body>
    </html>
  );
}
