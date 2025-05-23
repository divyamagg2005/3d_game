
"use client";

import { useState, useEffect } from 'react';
import { Shield, Expand, Minimize } from 'lucide-react'; // Added Expand and Minimize
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added Button


export default function GameUIOverlay() {
  const [isClient, setIsClient] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);


  useEffect(() => {
    setIsClient(true); 
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };

  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };


  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col text-foreground">
      {isClient && (
        <>
         <div className="self-end pointer-events-auto">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
              {isFullscreen ? <Minimize className="h-6 w-6" /> : <Expand className="h-6 w-6" />}
            </Button>
          </div>

          <div className="mt-auto self-start">
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-md">
              <CardContent className="p-2 md:p-3">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
              </CardContent>
              </Card>
          </div>
        </>
      )}

       <div
            id="blocker"
            className="absolute inset-0 bg-black/50 grid place-items-center text-white text-center pointer-events-auto z-10"
            // style={{ display: 'grid' }} // ArenaDisplay will control this
        >
        <div
            id="instructions"
            className="p-8 rounded-lg bg-background/90 shadow-xl cursor-pointer"
            // style={{ display: 'block' }} // ArenaDisplay will control this
        >
          <p className="text-2xl font-bold mb-4">Click to Play</p>
          <p className="text-lg">Use W, A, S, D to move.</p>
          <p className="text-lg">Move mouse to look.</p>
          <p className="text-lg">Press SPACE to Jump.</p>
          <p className="text-lg">Hold SHIFT to Run.</p>
          <p className="text-lg">Press CTRL or C to Crouch.</p>
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
