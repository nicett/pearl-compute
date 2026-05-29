import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from './i18n/context';

export const metadata: Metadata = {
  title: 'Pearl Mining Profit Calculator',
  description: 'Dynamic Interactive | Hashrate Decoupling | Auto Cache | Bleeding Alert',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com" async />
      </head>
      <body className="p-4 md:p-8 min-h-screen flex flex-col">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
