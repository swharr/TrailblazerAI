import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Sidebar } from '@/components/navigation/sidebar';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'TrailBlazer AI - Overland Route Planning & Trail Analysis',
  description:
    'AI-powered overland route planning and trail analysis from photos. Plan your next adventure with confidence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Sidebar />
          <main className="min-h-screen md:pl-64">
            <div className="pt-16 md:pt-0">{children}</div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
