
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
  // Use a ref to track the key of the ad that has been loaded in this component instance.
  // This ensures that if the adKey prop changes, the ad will be reloaded.
  const loadedAdKeyRef = useRef<string | null>(null);

  useEffect(() => {
    console.log(`AdsterraAdSlot: Effect run for ${containerIdSuffix} with key ${adKey}`);
    if (adContainerRef.current) {
      // If the current adKey is different from the one already loaded,
      // or if no ad has been loaded yet in this instance.
      if (loadedAdKeyRef.current !== adKey) {
        console.log(`AdsterraAdSlot: Clearing container and injecting scripts for ${containerIdSuffix} (adKey: ${adKey})`);
        // Clear previous ad content
        adContainerRef.current.innerHTML = '';

        const atOptionsScript = document.createElement('script');
        atOptionsScript.type = 'text/javascript';
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
        // Default async loading is generally preferred.
        // invokeScript.async = false; 
        invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
        invokeScript.onload = () => {
          console.log(`AdsterraAdSlot: invoke.js loaded successfully for ${containerIdSuffix} (adKey: ${adKey})`);
        };
        invokeScript.onerror = () => {
          console.error(`AdsterraAdSlot: invoke.js script loading error for slot ${containerIdSuffix} (adKey: ${adKey})`);
        };
        adContainerRef.current.appendChild(invokeScript);
        
        loadedAdKeyRef.current = adKey; // Mark this adKey as loaded for this instance
        console.log(`AdsterraAdSlot: loadedAdKeyRef set to ${adKey} for ${containerIdSuffix}`);
      } else {
        console.log(`AdsterraAdSlot: Ad for key ${adKey} already attempted for ${containerIdSuffix}, not re-injecting.`);
      }
    } else {
      console.warn(`AdsterraAdSlot: adContainerRef.current is null for ${containerIdSuffix}. Ad will not load.`);
    }

    // Cleanup function:
    // True cleanup of Adsterra's global effects or iframes is difficult without their API.
    // Relying on the adKey change logic to re-initialize.
    return () => {
        // console.log(`AdsterraAdSlot: Cleanup for ${containerIdSuffix}`);
        // If the component unmounts, loadedAdKeyRef will be gone with it.
        // If we wanted to be super explicit, we could set loadedAdKeyRef.current = null here,
        // but it's usually not necessary as a new instance will have it null anyway.
    };
  }, [adKey, configHeight, configWidth, containerIdSuffix]); // Dependencies for the effect

  // The div that will contain the ad scripts and the ad iframe
  return <div ref={adContainerRef} id={`ad-container-${containerIdSuffix}`} style={{ width: `${configWidth}px`, height: `${configHeight}px`, margin: 'auto' }} />;
};

export default AdsterraAdSlot;
