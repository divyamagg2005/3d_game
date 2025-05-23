
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import { PLAYER_MAX_HEALTH } from '@/config/game-constants';

interface PlayerHealthContextType {
  currentHealth: number;
  setCurrentHealth: Dispatch<SetStateAction<number>>;
  maxHealth: number;
}

const PlayerHealthContext = createContext<PlayerHealthContextType | undefined>(undefined);

export function PlayerHealthProvider({ children }: { children: ReactNode }) {
  const [currentHealth, setCurrentHealth] = useState<number>(PLAYER_MAX_HEALTH);
  const maxHealth = PLAYER_MAX_HEALTH; // Max health is constant for now

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // if the provider re-renders but the health values haven't changed.
  const contextValue = useMemo(() => ({
    currentHealth,
    setCurrentHealth,
    maxHealth,
  }), [currentHealth, maxHealth]); // setCurrentHealth is stable

  return (
    <PlayerHealthContext.Provider value={contextValue}>
      {children}
    </PlayerHealthContext.Provider>
  );
}

export function usePlayerHealth() {
  const context = useContext(PlayerHealthContext);
  if (context === undefined) {
    throw new Error('usePlayerHealth must be used within a PlayerHealthProvider');
  }
  return context;
}
