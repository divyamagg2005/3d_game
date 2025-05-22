import type { ReactNode } from 'react';
import { GameLogo } from '@/components/icons/game-logo';
import Link from 'next/link';

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
      <main className="flex-grow relative flex flex-row">
        {/* Left Ad Space */}
        <aside className="w-64 bg-card p-4 flex flex-col items-center justify-center text-muted-foreground border-r border-border/40">
          <div className="border-2 border-dashed border-muted-foreground/30 p-10 rounded-lg text-center w-full h-full flex flex-col justify-center items-center">
            <p className="text-lg font-semibold">Ad Space</p>
            <p className="text-sm">Future advertisement</p>
          </div>
        </aside>

        {/* Game Content Area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Right Ad Space */}
        <aside className="w-64 bg-card p-4 flex flex-col items-center justify-center text-muted-foreground border-l border-border/40">
          <div className="border-2 border-dashed border-muted-foreground/30 p-10 rounded-lg text-center w-full h-full flex flex-col justify-center items-center">
            <p className="text-lg font-semibold">Ad Space</p>
            <p className="text-sm">Future advertisement</p>
          </div>
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
