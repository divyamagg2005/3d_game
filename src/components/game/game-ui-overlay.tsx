
"use client";

import { useState, useEffect } from 'react';
import { Shield, Expand, Minimize } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GameUIOverlay() {
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsClient(true); // Component has mounted on client

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Check initial fullscreen state (e.g. if F11 was pressed before component mount)
    if (typeof document !== 'undefined') {
      setIsFullscreen(!!document.fullscreenElement);
    }
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        // setIsFullscreen(true); // State updated by event listener
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${(err as Error).message} (${(err as Error).name})`);
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
          // setIsFullscreen(false); // State updated by event listener
        } catch (err) {
          console.error(`Error attempting to disable full-screen mode: ${(err as Error).message} (${(err as Error).name})`);
        }
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col text-foreground">
      {/* Top Row: Score and Timer - Render content only on client */}
      {isClient && (
        <>
          {/* Fullscreen Button */}
          <div className="absolute top-4 right-4 pointer-events-auto z-20">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullscreen} 
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="bg-card/80 hover:bg-card/95 backdrop-blur-sm border-gray-500 shadow-md"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
            </Button>
          </div>

          {/* Placeholder for player stats or other UI elements */}
          <div className="mt-auto self-start">
            <Card className="bg-card/80 backdrop-blur-sm border-gray-500 shadow-md">
              <CardContent className="p-2 md:p-3">
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Centered message for pointer lock and pause state. Its visibility is controlled by ArenaDisplay. */}
       <div 
            id="blocker" 
            className="absolute inset-0 bg-black/50 grid place-items-center text-white text-center pointer-events-auto z-10" // Ensure blocker is behind fullscreen button if overlapping
            style={{ display: 'grid' }} 
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
