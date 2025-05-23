
"use client";

import type { ReactNode } from 'react';
import { GameLogo } from '@/components/icons/game-logo';
import Link from 'next/link';
import AdsterraAdSlot from '@/components/ads/adsterra-ad-slot';

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <GameLogo className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl sm:inline-block text-primary hover:text-accent transition-colors">
              WebGladiator
            </span>
          </Link>
          {/* Navigation can be added here */}
        </div>
      </header>

      <main className="relative flex flex-row flex-grow">
        <aside className="w-64 bg-card p-4 flex-col items-center justify-center text-muted-foreground border-r border-border/40 transition-all duration-300 ease-in-out hidden md:flex">
          <AdsterraAdSlot
            adKey="b489cb229500818212b8f74504664a80"
            configWidth={160}
            configHeight={600}
            containerIdSuffix="left-sidebar"
          />
        </aside>

        <div
          className="flex flex-col bg-background flex-grow overflow-hidden"
        >
          {children}
        </div>

        <aside className="w-64 bg-card p-4 flex-col items-center justify-center text-muted-foreground border-l border-border/40 transition-all duration-300 ease-in-out hidden md:flex">
          <AdsterraAdSlot
            adKey="b489cb229500818212b8f74504664a80" // Using the same adKey. If Adsterra needs different keys for different slots, update this.
            configWidth={160}
            configHeight={600}
            containerIdSuffix="right-sidebar"
          />
        </aside>
      </main>
      <footer className="py-6 md:px-8 md:py-0 bg-background border-t border-border/40">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            Built for glory in the digital arena.
          </p>
        </div>
      </footer>
    </div>
  );
}
