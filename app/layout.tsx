import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from './i18n/context';
import { ThemeProvider } from './theme/context';

export const metadata: Metadata = {
  title: 'Pearl Mining Profit Calculator',
  description: 'Dynamic Interactive | Hashrate Decoupling | Auto Cache | Bleeding Alert',
};

// 防闪烁脚本：在 React 水合前立即应用主题
const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('pearl_theme');
    var d;
    if(t==='dark')d=true;
    else if(t==='light')d=false;
    else d=window.matchMedia('(prefers-color-scheme:dark)').matches;
    if(d)document.documentElement.classList.add('dark');
  }catch(e){}
})()
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
