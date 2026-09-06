import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import PostTopBanner from './PostTopBanner';
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
      <head>
        <style>{`.formula-note,.site-footer{display:none!important}`}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostTopBanner />
        {children}
        <footer
          style={{
            margin: '24px auto 0',
            padding: '18px 16px 24px',
            borderTop: '1px solid #c8dcf5',
            background: '#f4f8fd',
            color: '#24558f',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>六合公式库</div>
          <div style={{ marginTop: 3, fontSize: 12, letterSpacing: '0.14em' }}>
            GS888888.COM
          </div>
          <a
            href="https://t.me/lhwadbot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 12,
              padding: '9px 24px',
              borderRadius: 999,
              background: '#2467bd',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            广告咨询
          </a>
          <div style={{ marginTop: 12, fontSize: 12, color: '#6c82a0' }}>
            仅供娱乐参考
          </div>
        </footer>
        <Script
          src="https://s4.cnzz.com/z.js?id=1281498798&async=1"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
