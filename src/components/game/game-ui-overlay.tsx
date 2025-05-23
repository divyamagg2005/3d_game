
"use client";

import { useState, useEffect } from 'react';
import { Shield, Expand, Minimize } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDistractionFree } from '@/contexts/distraction-free-context';

export default function GameUIOverlay() {
  const [isClient, setIsClient] = useState(false);
  const { isDistractionFree, toggleDistractionFree } = useDistractionFree();

  useEffect(() => {
    setIsClient(true); // Component has mounted on client
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col text-foreground">
      {/* Top Row elements */}
      {isClient && (
        <>
          {/* Distraction Free Button */}
          <div className="absolute top-4 right-4 pointer-events-auto z-20">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDistractionFree}
              title={isDistractionFree ? "Exit Distraction Free Mode" : "Enter Distraction Free Mode"}
              className="bg-card/80 hover:bg-card/95 backdrop-blur-sm border-border shadow-md"
            >
              {isDistractionFree ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
            </Button>
          </div>

          {/* Placeholder for player stats or other UI elements */}
          {!isDistractionFree && ( // Only show shield if not in distraction free mode
            <div className="mt-auto self-start">
                <Card className="bg-card/80 backdrop-blur-sm border-border shadow-md">
                <CardContent className="p-2 md:p-3">
                    <Shield className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
                </CardContent>
                </Card>
            </div>
          )}
        </>
      )}

      {/* Centered message for pointer lock and pause state. Its visibility is controlled by ArenaDisplay. */}
       <div
            id="blocker"
            className="absolute inset-0 bg-black/50 grid place-items-center text-white text-center pointer-events-auto z-10" // Ensure blocker is behind button if overlapping
            style={{ display: 'none' }} // Initial display controlled by ArenaDisplay
        >
        <div
            id="instructions"
            className="p-8 rounded-lg bg-background/90 shadow-xl cursor-pointer"
            style={{ display: 'none' }}
        >
          <p className="text-2xl font-bold mb-4">Click to Play</p>
          <p className="text-lg">Use W, A, S, D to move.</p>
          <p className="text-lg">Move mouse to look.</p>
          <p className="text-lg">Press ESC to release mouse.</p>
          <p className="text-lg mt-2 font-semibold">Press P to Pause/Resume game.</p>
        </div>
        <div
            id="paused-message"
            className="p-8 rounded-lg bg-background/90 shadow-xl"
            style={{display: 'none'}}
        >
          <p className="text-2xl font-bold mb-4">Game Paused</p>
          <p className="text-lg">Press P to Resume</p>
        </div>
      </div>
    </div>
  );
}
