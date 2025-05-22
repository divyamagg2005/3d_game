
"use client";

import { useState, useEffect } from 'react';
import { Shield, Swords, Hourglass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function GameUIOverlay() {
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Component has mounted on client

    // Mock score increment - only run if not paused (conceptual, actual pause logic is in ArenaDisplay)
    const scoreInterval = setInterval(() => {
      setScore(prevScore => prevScore + 10);
    }, 5000);

    // Timer countdown - only run if not paused
    const timerInterval = setInterval(() => {
      setTimeRemaining(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    // The actual pausing of these intervals would ideally be controlled by ArenaDisplay's pause state.
    // For simplicity here, they keep running, but a real game would pause these too.

    return () => {
      clearInterval(scoreInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isClient) {
    // Render nothing or a placeholder on the server to avoid hydration mismatch for #blocker style
    return null; 
  }

  return (
    <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col text-foreground">
      {/* Top Row: Score and Timer */}
      <div className="flex justify-between items-start">
        {/* Score */}
        <Card className="bg-card/80 backdrop-blur-sm border-accent shadow-lg">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <Swords className="h-6 w-6 md:h-8 md:w-8 text-accent" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-mono uppercase">Score</p>
                <p className="text-xl md:text-2xl font-bold text-accent">{score.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timer */}
        <Card className="bg-card/80 backdrop-blur-sm border-primary shadow-lg">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <Hourglass className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-mono uppercase">Time</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{formatTime(timeRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for player stats or other UI elements */}
      <div className="mt-auto self-start">
        <Card className="bg-card/80 backdrop-blur-sm border-gray-500 shadow-md">
          <CardContent className="p-2 md:p-3">
            <Shield className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      {/* Centered message for pointer lock and pause state. Its visibility is controlled by ArenaDisplay. */}
       <div 
            id="blocker" 
            className="absolute inset-0 bg-black/50 grid place-items-center text-white text-center pointer-events-auto"
            // Initial display style is set here and controlled by ArenaDisplay's useEffect and handlers
        >
        <div id="instructions" className="p-8 rounded-lg bg-background/90 shadow-xl cursor-pointer">
          <p className="text-2xl font-bold mb-4">Click to Play</p>
          <p className="text-lg">Use W, A, S, D to move.</p>
          <p className="text-lg">Move mouse to look.</p>
          <p className="text-lg">Press ESC to release mouse.</p>
          <p className="text-lg mt-2 font-semibold">Press P to Pause/Resume game.</p>
        </div>
        <div id="paused-message" className="p-8 rounded-lg bg-background/90 shadow-xl" style={{display: 'none'}}>
          <p className="text-2xl font-bold mb-4">Game Paused</p>
          <p className="text-lg">Press P to Resume</p>
        </div>
      </div>
    </div>
  );
}

