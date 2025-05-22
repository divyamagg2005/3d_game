import ArenaDisplay from '@/components/game/arena-display';
import GameUIOverlay from '@/components/game/game-ui-overlay';

export default function HomePage() {
  return (
    <div className="w-full h-full relative overflow-hidden"> {/* Adjusted height to fill parent */}
      <ArenaDisplay />
      <GameUIOverlay />
    </div>
  );
}
