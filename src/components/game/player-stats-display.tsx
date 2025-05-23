
'use client';

import { Heart, Timer, CheckSquare, AlertTriangle, ShieldEllipsis } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { usePlayerHealth } from '@/contexts/player-health-context';

// Timer and checkpoint constants remain for placeholder functionality
const INITIAL_TIME = 90;
const TOTAL_CHECKPOINTS = 5;

export default function PlayerStatsDisplay() {
  const { currentHealth, maxHealth, invincibilityEndTime } = usePlayerHealth();
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [checkpointsFound, setCheckpointsFound] = useState(0);
  const [villainNearby, setVillainNearby] = useState(false); // Placeholder state
  const [invincibilityTimeLeft, setInvincibilityTimeLeft] = useState<number | null>(null);

  // Placeholder effect to simulate timer countdown - replace with actual game logic
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Placeholder to toggle villain nearby status for visual testing
  useEffect(() => {
    const villainToggleInterval = setInterval(() => {
      setVillainNearby((prev) => !prev);
    }, 7000); // Toggle every 7 seconds
    return () => clearInterval(villainToggleInterval);
  }, []);

  // Invincibility Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (invincibilityEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((invincibilityEndTime - now) / 1000));
        setInvincibilityTimeLeft(remaining);

        if (remaining <= 0) {
          setInvincibilityTimeLeft(null); // Timer ends
          // No need to call clearInvincibility here, ArenaDisplay manages isInvincibleRef
          if (interval) clearInterval(interval);
        }
      };

      updateTimer(); // Initial call
      interval = setInterval(updateTimer, 1000);
    } else {
      setInvincibilityTimeLeft(null); // Clear timer if invincibility ends externally
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [invincibilityEndTime]);


  const healthPercentage = maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;

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
            {currentHealth} / {maxHealth}
          </p>
        </CardContent>
      </Card>

      {invincibilityTimeLeft !== null && invincibilityTimeLeft > 0 && (
        <Card className="bg-accent/80 backdrop-blur-sm border-accent shadow-lg">
          <CardHeader className="p-3">
            <CardTitle className="text-lg flex items-center text-accent-foreground">
              <ShieldEllipsis className="h-5 w-5 mr-2 animate-pulse" />
              Invincible!
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-3xl font-bold text-center text-accent-foreground">
              {invincibilityTimeLeft}s
            </p>
          </CardContent>
        </Card>
      )}

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

      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center text-primary-foreground">
             <AlertTriangle className={`h-5 w-5 mr-2 ${villainNearby ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            Threat Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-center">
          {villainNearby ? (
            <p className="text-lg font-semibold text-red-400">Villain Nearby!</p>
          ) : (
            <p className="text-md text-muted-foreground">No threats detected.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
