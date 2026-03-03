'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@openlintel/ui';

const tabs = [
  { name: 'Contractors', href: '/marketplace' },
  { name: 'Product Catalogue', href: '/marketplace/catalogue' },
  { name: 'Design Gallery', href: '/marketplace/gallery' },
  { name: 'Offcuts Exchange', href: '/marketplace/offcuts' },
];

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/marketplace'
              ? pathname === '/marketplace'
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
