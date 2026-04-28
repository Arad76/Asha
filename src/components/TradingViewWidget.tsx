/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  interval?: string;
  indicators?: string[];
}

function TradingViewWidget({ interval = "1", indicators = [
  "STD;Pivot_Points_Standard",
  "STD;Fibonacci_Retracement",
  "STD;Bollinger_Bands",
  "STD;RSI"
] }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerRef = container.current;
    if (!containerRef) return;
    
    // Create a unique ID for this instance to prevent cross-talk
    const widgetId = `tv-chart-${Math.random().toString(36).substr(2, 9)}`;
    containerRef.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.id = widgetId;
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    
    widgetContainer.appendChild(widgetDiv);
    containerRef.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Add a specific target for the script
    const scriptConfig = {
      "autosize": true,
      "symbol": "TVC:USOIL",
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1", // 1 is candles
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "container_id": widgetId,
      "studies": indicators,
      "show_popup_button": false,
      "withdateranges": true,
      "hide_side_toolbar": true,
      "details": false,
      "hotlist": false,
      "hide_top_toolbar": true,
      "save_image": false,
      "backgroundColor": "rgba(10, 10, 10, 1)",
      "gridColor": "rgba(255, 255, 255, 0.02)"
    };

    script.innerHTML = JSON.stringify(scriptConfig);

    // Append script to the widget container with a debounce to survive StrictMode
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
  }, [interval, indicators]);

  return (
    <div className="absolute inset-0 border border-oil-border rounded-lg overflow-hidden bg-oil-black" ref={container} />
  );
}

export default memo(TradingViewWidget);
