'use client';

interface FooterProps {
  t: (key: string) => string;
}

export default function Footer({ t }: FooterProps) {
  return (
    <div className="bg-surface border-t border-edge p-4 text-center text-[9px] text-muted/40 tracking-[0.2em] uppercase">
      <p>{t('footer')}</p>
    </div>
  );
}
