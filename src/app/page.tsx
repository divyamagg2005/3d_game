import ArenaDisplay from '@/components/game/arena-display';
import GameUIOverlay from '@/components/game/game-ui-overlay';

export default function HomePage() {
  return (
    <div className="w-full h-[calc(100vh-8rem)] relative overflow-hidden"> {/* Adjusted height for header/footer */}
      <ArenaDisplay />
      <GameUIOverlay />
    </div>
  );
}
