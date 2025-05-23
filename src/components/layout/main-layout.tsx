
"use client";

import type { ReactNode } from 'react';
import { GameLogo } from '@/components/icons/game-logo';
import Link from 'next/link';
import { useState, useEffect } from 'react';

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const [isInFullscreen, setIsInFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsInFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Initial check in case fullscreen was entered via F11 or other means
    if (typeof document !== 'undefined') {
      setIsInFullscreen(!!document.fullscreenElement);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {!isInFullscreen && (
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
      )}

      <main className={`relative ${isInFullscreen ? 'flex-1' : 'flex-grow flex flex-row'}`}>
        {/* Left Ad Space */}
        {!isInFullscreen && (
          <aside className="w-64 bg-card p-4 flex-col items-center justify-center text-muted-foreground border-r border-border/40 transition-all duration-300 ease-in-out hidden md:flex">
            <div className="border-2 border-dashed border-muted-foreground/30 p-10 rounded-lg text-center w-full h-full flex flex-col justify-center items-center">
              <p className="text-lg font-semibold">Ad Space</p>
              <p className="text-sm">Future advertisement</p>
            </div>
          </aside>
        )}

        {/* Game Content Area */}
        <div
          className={`${
            isInFullscreen
              ? 'w-full h-full fixed inset-0 z-[60] flex flex-col bg-background' // Ensure bg-background for fullscreen
              : 'flex-grow flex flex-col overflow-hidden'
          }`}
        >
          {children}
        </div>

        {/* Right Ad Space */}
        {!isInFullscreen && (
          <aside className="w-64 bg-card p-4 flex-col items-center justify-center text-muted-foreground border-l border-border/40 transition-all duration-300 ease-in-out hidden md:flex">
            <div className="border-2 border-dashed border-muted-foreground/30 p-10 rounded-lg text-center w-full h-full flex flex-col justify-center items-center">
              <p className="text-lg font-semibold">Ad Space</p>
              <p className="text-sm">Future advertisement</p>
            </div>
          </aside>
        )}
      </main>
      {!isInFullscreen && (
        <footer className="py-6 md:px-8 md:py-0 bg-background border-t border-border/40">
          <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
            <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
              Built for glory in the digital arena.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
