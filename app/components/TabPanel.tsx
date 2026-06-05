'use client';

import { ReactNode } from 'react';

interface TabPanelProps {
  children: ReactNode;
}

/**
 * Tab 内容面板容器
 */
export default function TabPanel({ children }: TabPanelProps) {
  return (
    <div className="px-6 py-5 border-t border-edge">
      {children}
    </div>
  );
}
