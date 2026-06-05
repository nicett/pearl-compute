'use client';

export type TabId = 'payback' | 'chart' | 'details';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs: { id: TabId; label: string }[];
}

/**
 * Tab 切换栏 — 工业风格的极简 Tab
 */
export default function TabBar({ activeTab, onTabChange, tabs }: TabBarProps) {
  return (
    <div className="border-t border-edge">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 text-[10px] tracking-[0.2em] uppercase font-semibold transition-colors duration-150 border-b-2 ${
                isActive
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted hover:text-gray-300 hover:bg-surface-light'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
