import '@/styles/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Geist, Geist_Mono } from 'next/font/google';

import { Toaster } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { TRPCReactProvider } from '@/trpc/client';

export const metadata: Metadata = {
  title: {
    default: 'T3 App',
    template: '%s · T3 App',
  },
  description:
    'Next.js 16, tRPC 11, Prisma 8, Better Auth, Tailwind CSS 4 and shadcn/ui.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  // Loaded when monospace text renders, not preloaded on every route.
  preload: false,
});

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes sets the theme class before hydration.
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, 'antialiased')}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <Toaster>{children}</Toaster>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
