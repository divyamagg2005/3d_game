
import ArenaDisplay from '@/components/game/arena-display';
import GameUIOverlay from '@/components/game/game-ui-overlay';

export default function HomePage() {
  return (
    // The parent div in MainLayout will handle fullscreen fixed positioning if needed
    // The key is that ArenaDisplay and GameUIOverlay should fill their parent.
    <div className="w-full h-full relative overflow-hidden flex-1"> 
      <ArenaDisplay />
      <GameUIOverlay />
    </div>
  );
}
