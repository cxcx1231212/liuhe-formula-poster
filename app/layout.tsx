import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import {Suspense} from 'react';
import FormulaHistoryButton from './FormulaHistoryButton';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '六合公式库｜每期公式自动更新',
  description: '汇总香港、澳门和疯狂天天彩各类公式，按期开奖后自动更新。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Suspense fallback={null}><FormulaHistoryButton/></Suspense>
      </body>
    </html>
  );
}
