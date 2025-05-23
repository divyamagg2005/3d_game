
"use client";

import { useEffect, useState } from 'react';
import { MoveUp, MoveDown, MoveLeft, MoveRight, ArrowUpCircle, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile'; // Using the existing robust hook

export default function MobileControlsOverlay() {
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isMobile) {
    return null;
  }

  const handleAction = (action: string) => {
    console.log(`Mobile action (conceptual): ${action}`);
    // In a real implementation, this would trigger player movement or actions.
    // This will require significant changes in ArenaDisplay.tsx to handle these inputs.
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 md:hidden z-20">
      {/* Movement Controls (Left Side) */}
      <div className="absolute bottom-6 left-4 pointer-events-auto">
        <div className="grid grid-cols-3 gap-2 w-36 opacity-70">
          <div /> {/* Spacer */}
          <Button variant="outline" size="icon" className="bg-card/60 backdrop-blur-sm rounded-lg w-12 h-12" onClick={() => handleAction('forward')}>
            <MoveUp className="h-6 w-6" />
          </Button>
          <div /> {/* Spacer */}
          <Button variant="outline" size="icon" className="bg-card/60 backdrop-blur-sm rounded-lg w-12 h-12" onClick={() => handleAction('left')}>
            <MoveLeft className="h-6 w-6" />
          </Button>
          <Button variant="outline" size="icon" className="bg-card/60 backdrop-blur-sm rounded-lg w-12 h-12" onClick={() => handleAction('backward')}>
            <MoveDown className="h-6 w-6" />
          </Button>
          <Button variant="outline" size="icon" className="bg-card/60 backdrop-blur-sm rounded-lg w-12 h-12" onClick={() => handleAction('right')}>
            <MoveRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Action Controls (Right Side) */}
      <div className="absolute bottom-6 right-4 pointer-events-auto flex flex-col items-center space-y-3 opacity-70">
        <Button variant="outline" size="icon" className="w-12 h-12 rounded-full bg-card/60 backdrop-blur-sm" onClick={() => handleAction('run')}>
           <span className="text-xs font-bold">RUN</span>
        </Button>
         <Button variant="outline" size="icon" className="w-12 h-12 rounded-full bg-card/60 backdrop-blur-sm" onClick={() => handleAction('crouch')}>
          <ArrowDownToLine className="h-6 w-6" />
        </Button>
        <Button variant="outline" size="icon" className="w-16 h-16 rounded-full bg-card/60 backdrop-blur-sm" onClick={() => handleAction('jump')}>
          <ArrowUpCircle className="h-8 w-8" />
        </Button>
      </div>

      {/* Look Area (Conceptual Placeholder) */}
      {/* Actual touch-to-look implementation is complex and would require event handling here */}
      {/* and in ArenaDisplay.tsx to control the Three.js camera. */}
      <div className="absolute top-1/3 right-2 h-1/3 w-2/5 pointer-events-auto opacity-20 border border-dashed border-foreground/50 rounded-md flex items-center justify-center">
          <p className="text-[10px] text-center p-1">Touch & Drag to Look (Conceptual Area)</p>
      </div>

       <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto w-full px-4">
        <p className="text-xs text-center bg-background/80 p-2 rounded-md shadow">
          Mobile controls are conceptual. Full interaction requires disabling pointer lock and implementing touch input for movement and camera.
        </p>
      </div>
    </div>
  );
}
