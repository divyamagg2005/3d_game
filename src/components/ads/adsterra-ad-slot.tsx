
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
  const adLoadedRef = useRef(false); // Prevent re-injecting scripts on HMR or unnecessary re-renders

  useEffect(() => {
    console.log(`AdsterraAdSlot: Effect run for ${containerIdSuffix} with key ${adKey}`);
    if (adContainerRef.current && !adLoadedRef.current) {
      console.log(`AdsterraAdSlot: Clearing container and injecting scripts for ${containerIdSuffix}`);
      // Clear previous ad content if any (e.g., during HMR or if effect re-runs unexpectedly)
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
        console.log('atOptions set for ${containerIdSuffix}:', JSON.parse(JSON.stringify(atOptions)));
      `;
      adContainerRef.current.appendChild(atOptionsScript);

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
      invokeScript.async = false; // Attempt to make it load and execute more sequentially
      invokeScript.onload = () => {
        console.log(`AdsterraAdSlot: invoke.js loaded successfully for ${containerIdSuffix}`);
      };
      invokeScript.onerror = () => {
        console.error(`AdsterraAdSlot: invoke.js script loading error for slot ${containerIdSuffix}`);
      };
      adContainerRef.current.appendChild(invokeScript);
      
      adLoadedRef.current = true;
      console.log(`AdsterraAdSlot: adLoadedRef set to true for ${containerIdSuffix}`);
    } else {
      if (!adContainerRef.current) {
        console.warn(`AdsterraAdSlot: adContainerRef.current is null for ${containerIdSuffix}. Ad will not load.`);
      } else if (adLoadedRef.current) {
        console.log(`AdsterraAdSlot: Scripts already loaded for ${containerIdSuffix} (adLoadedRef is true), not re-injecting.`);
      }
    }

    // Cleanup function:
    // Adsterra's scripts might create global variables or iframes.
    // True cleanup is hard without knowing their internals.
    // Setting adLoadedRef to false on unmount might cause re-injection if component re-mounts,
    // which can be problematic for ad scripts. For now, we rely on adLoadedRef to prevent re-injection
    // for the lifetime of this component instance given stable props.
    return () => {
        // If the component truly unmounts and might remount later with same props,
        // and ads *should* reload, then adLoadedRef.current = false; might be needed here.
        // But for now, assume stable mounting for each slot.
        // console.log(`AdsterraAdSlot: Cleanup for ${containerIdSuffix}`);
    };
  }, [adKey, configHeight, configWidth, containerIdSuffix]); // Explicitly list dependencies

  // The div that will contain the ad scripts and the ad iframe
  return <div ref={adContainerRef} id={`ad-container-${containerIdSuffix}`} style={{ width: `${configWidth}px`, height: `${configHeight}px`, margin: 'auto' }} />;
};

export default AdsterraAdSlot;
