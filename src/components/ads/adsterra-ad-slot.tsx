
'use client';

import React, { useEffect, useRef } from 'react';

interface AdsterraAdSlotProps {
  adKey: string;
  configHeight: number;
  configWidth: number;
  containerIdSuffix: string;
}

const AdsterraAdSlot: React.FC<AdsterraAdSlotProps> = ({
  adKey,
  configHeight,
  configWidth,
  containerIdSuffix,
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const adLoadedRef = useRef(false); // Prevent re-injecting scripts on HMR

  useEffect(() => {
    if (adContainerRef.current && !adLoadedRef.current) {
      // Clear previous ad content if any (e.g., during HMR)
      adContainerRef.current.innerHTML = '';

      const atOptionsScript = document.createElement('script');
      atOptionsScript.type = 'text/javascript';
      // It's important to set innerHTML for the options script
      // as Adsterra's invoke.js likely expects atOptions to be globally defined this way
      atOptionsScript.innerHTML = `
        atOptions = {
          'key' : '${adKey}',
          'format' : 'iframe',
          'height' : ${configHeight},
          'width' : ${configWidth},
          'params' : {}
        };
      `;
      adContainerRef.current.appendChild(atOptionsScript);

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
      invokeScript.async = true; // Standard practice for ad scripts
      invokeScript.onerror = () => {
        console.error(`Adsterra invoke.js script loading error for slot ${containerIdSuffix}`);
      };
      adContainerRef.current.appendChild(invokeScript);
      
      adLoadedRef.current = true;
    }

    // Cleanup function:
    // Adsterra's scripts might create global variables or iframes.
    // True cleanup is hard without knowing their internals.
    // Setting adLoadedRef.current to false on unmount could allow re-injection if component remounts.
    // For simplicity, we're focusing on initial load.
    return () => {
        // If you want scripts to re-load if component re-mounts (e.g. navigating away and back)
        // you might set adLoadedRef.current = false; here.
        // However, for ad scripts, it's often better they load once per page view.
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adKey, configHeight, configWidth, containerIdSuffix]); // Dependencies ensure script re-runs if key props change

  // The div that will contain the ad scripts and the ad iframe
  return <div ref={adContainerRef} style={{ width: `${configWidth}px`, height: `${configHeight}px`, margin: 'auto' }} />;
};

export default AdsterraAdSlot;
