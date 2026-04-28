/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, memo } from 'react';

interface SingleQuoteWidgetProps {
  symbol: string;
}

function SingleQuoteWidget({ symbol }: SingleQuoteWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerRef = container.current;
    if (!containerRef) return;
    
    const widgetId = `tv-quote-${symbol.replace(':', '-')}-${Math.random().toString(36).substr(2, 9)}`;
    containerRef.innerHTML = "";
    
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.id = widgetId;
    
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    
    widgetContainer.appendChild(widgetDiv);
    containerRef.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbol": symbol,
      "width": "100%",
      "height": "100%",
      "interval": "60",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "hide_top_toolbar": true,
      "hide_side_toolbar": true,
      "save_image": false,
      "calendar": false,
      "hide_legend": true,
      "hide_volume": true,
      "range": "1D",
      "backgroundColor": "rgba(20, 20, 20, 0)",
      "gridColor": "rgba(255, 255, 255, 0.05)",
      "withdateranges": false,
      "allow_symbol_change": false,
      "container_id": widgetId
    });
    
    const timeoutId = setTimeout(() => {
      if (widgetContainer) {
        widgetContainer.appendChild(script);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (containerRef) {
        containerRef.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div className="w-full h-full bg-transparent overflow-hidden" ref={container} />
  );
}

export default memo(SingleQuoteWidget);
