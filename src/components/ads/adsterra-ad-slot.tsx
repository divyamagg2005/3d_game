
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
    console.log(`AdsterraAdSlot: Initializing for ${containerIdSuffix} with key ${adKey}`);
    if (adContainerRef.current && !adLoadedRef.current) {
      console.log(`AdsterraAdSlot: Injecting scripts for ${containerIdSuffix}`);
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
    } else {
      if (!adContainerRef.current) {
        console.warn(`AdsterraAdSlot: adContainerRef.current is null for ${containerIdSuffix}. Ad will not load.`);
      } else if (adLoadedRef.current) {
        console.log(`AdsterraAdSlot: Scripts already loaded for ${containerIdSuffix}, not re-injecting.`);
      }
    }

    // Cleanup function:
    // Adsterra's scripts might create global variables or iframes.
    // True cleanup is hard without knowing their internals.
    return () => {
        // If you want scripts to re-load if component re-mounts
        // you might set adLoadedRef.current = false; here.
        // However, for ad scripts, it's often better they load once per page view if props are static.
    };
  }, [adKey, configHeight, configWidth, containerIdSuffix]); // Explicitly list dependencies

  // The div that will contain the ad scripts and the ad iframe
  return <div ref={adContainerRef} style={{ width: `${configWidth}px`, height: `${configHeight}px`, margin: 'auto' }} />;
};

export default AdsterraAdSlot;
