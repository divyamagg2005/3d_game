
"use client";

import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
// Button and related imports for fullscreen removed

export default function GameUIOverlay() {
  // isFullscreen, toggleFullscreen, and related useEffect removed

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col text-foreground">
      {/* Fullscreen button and its wrapper div removed */}

      <div className="mt-auto self-start pointer-events-auto z-30">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-md">
          <CardContent className="p-2 md:p-3">
              <Shield className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
          </CardContent>
          </Card>
      </div>

       <div
            id="blocker"
            className="absolute inset-0 bg-black/50 grid place-items-center text-white text-center pointer-events-auto z-10"
            // ArenaDisplay will control display style
        >
        <div
            id="instructions"
            className="p-8 rounded-lg bg-background/90 shadow-xl cursor-pointer"
            // ArenaDisplay will control display style
        >
          <p className="text-2xl font-bold mb-4">Click to Start Your Survival!</p>
          <p className="text-lg mb-3">Explore the arena and see how long you can last.</p>
          <p className="text-lg">Use W, A, S, D to move.</p>
          <p className="text-lg">Move mouse to look.</p>
          <p className="text-lg">Press SPACE to Jump (up to 4 times).</p>
          <p className="text-lg">Hold SHIFT to Run.</p>
          <p className="text-lg">Press CTRL or C to Crouch.</p>
          <p className="text-lg">Press F to toggle Torch.</p>
          <p className="text-lg">Press ESC to release mouse.</p>
          <p className="text-lg mt-2 font-semibold">Press P to Pause/Resume game.</p>
        </div>
        <div
            id="paused-message"
            className="p-8 rounded-lg bg-background/90 shadow-xl"
            style={{display: 'none'}} // ArenaDisplay will control display style
        >
          <p className="text-2xl font-bold mb-4">Game Paused</p>
          <p className="text-lg">Press P to Resume</p>
        </div>
      </div>
    </div>
  );
}
