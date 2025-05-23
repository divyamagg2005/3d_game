
'use client';

import React from 'react';
import Script from 'next/script';

// Define atOptions on window for TypeScript to recognize it
declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: object;
    };
  }
}

interface AdsterraAdSlotProps {
  adKey: string;
  configHeight: number;
  configWidth: number;
  containerIdSuffix: string; // To ensure unique script IDs if multiple same-key ads were on one page (though unlikely for this setup)
}

const AdsterraAdSlot: React.FC<AdsterraAdSlotProps> = ({ 
  adKey, 
  configHeight, 
  configWidth,
  containerIdSuffix
}) => {
  const optionsScriptId = `adsterra-options-${containerIdSuffix}`;
  const invokeScriptId = `adsterra-invoke-${containerIdSuffix}`;

  return (
    <div style={{ width: `${configWidth}px`, height: `${configHeight}px`, margin: 'auto' }}>
      {/* This script sets the global atOptions object */}
      <Script id={optionsScriptId} strategy="afterInteractive">
        {`
          window.atOptions = {
            'key' : '${adKey}',
            'format' : 'iframe',
            'height' : ${configHeight},
            'width' : ${configWidth},
            'params' : {}
          };
        `}
      </Script>
      {/* This script loads Adsterra's ad logic, which should use the window.atOptions */}
      <Script
        id={invokeScriptId}
        src={`//www.highperformanceformat.com/${adKey}/invoke.js`}
        strategy="afterInteractive"
        onError={(e) => {
          console.error('Adsterra invoke.js script loading error for slot ' + containerIdSuffix + ':', e);
        }}
      />
    </div>
  );
};

export default AdsterraAdSlot;
