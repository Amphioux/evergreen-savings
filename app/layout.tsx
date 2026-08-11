import type { Metadata } from 'next';
import Navbar from '@/components/navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evergreen Saving & Credit Group',
  description: 'Digital ledger and mini-banking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-800 min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}