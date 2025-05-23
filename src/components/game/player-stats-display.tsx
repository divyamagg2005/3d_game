
'use client';

import { Heart, Timer, CheckSquare, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';

// TODO: These values will eventually come from game state props
const MAX_HEALTH = 100;
const INITIAL_TIME = 90;
const TOTAL_CHECKPOINTS = 5;

export default function PlayerStatsDisplay() {
  const [currentHealth, setCurrentHealth] = useState(MAX_HEALTH);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [checkpointsFound, setCheckpointsFound] = useState(0);

  // Placeholder effect to simulate timer countdown - replace with actual game logic
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Placeholder effect to simulate health change - replace with actual game logic
  // useEffect(() => {
  //   const healthInterval = setInterval(() => {
  //     setCurrentHealth((prevHealth) => (prevHealth > 10 ? prevHealth - 5 : 0));
  //   }, 5000);
  //   return () => clearInterval(healthInterval);
  // }, []);

  // Placeholder effect to simulate checkpoint collection - replace with actual game logic
  // useEffect(() => {
  //   const checkpointInterval = setInterval(() => {
  //     setCheckpointsFound((prev) => (prev < TOTAL_CHECKPOINTS ? prev + 1 : TOTAL_CHECKPOINTS));
  //   }, 15000);
  //   return () => clearInterval(checkpointInterval);
  // }, []);


  const healthPercentage = (currentHealth / MAX_HEALTH) * 100;

  return (
    <div className="w-full p-4 space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center text-primary-foreground">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            Player Health
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Progress value={healthPercentage} className="w-full h-4 mb-1" />
          <p className="text-sm text-right font-semibold text-foreground">
            {currentHealth} / {MAX_HEALTH}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center text-primary-foreground">
            <Timer className="h-5 w-5 mr-2 text-blue-400" />
            Time Left
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-3xl font-bold text-center text-accent">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center text-primary-foreground">
            <CheckSquare className="h-5 w-5 mr-2 text-green-400" />
            Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-3xl font-bold text-center text-foreground">
            {checkpointsFound} / {TOTAL_CHECKPOINTS}
          </p>
        </CardContent>
      </Card>

      {/* Placeholder for Minimap */}
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg h-40">
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center text-primary-foreground">
            Minimap
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">[Minimap Area]</p>
        </CardContent>
      </Card>
    </div>
  );
}
