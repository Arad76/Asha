# Integration Strategy: TradingView, AstroSeek, and Predictive Frameworks

This document outlines the architecture, data ingestion strategy, and error-handling framework for integrating real-time market data (TradingView) and esoteric data (AstroSeek) for high-frequency WTI Crude Oil trading.

## 1. System Architecture & Components

The backend architecture demands a resilient data-fetching layer, decoupled from the client UI.

*   **Market Data Layer (Proxy/WebSocket):** Fetches minute-by-minute ticks from TradingView's undocumented WebSockets or a third-party equivalent (e.g., Finnhub, AlphaVantage) since raw TradingView widgets only provide client-side rendering.
*   **Esoteric Data Layer:** AstroSeek currently provides astrological data via an iframe/REST proxy. A scheduled background worker must scrape or pull Swiss Ephemeris data hour-by-hour to calculate planetary degrees.
*   **Data Normalization Engine:** Standardizes diverse data formats into a unified Time-Series Database (TSDB) for analysis (e.g., aligning a 1-minute price candle with the exact degree of Mars).
*   **Correlation & AI Engine (Gemini API):** Processes the unified data arrays to generate live trade setups and compute historical Pearson correlation scores.

## 2. Data Fetching Frequency & Normalization

To capture statistical significance in high-volatility environments, we must implement dual-frequency strategies.

### A. Frequency Strategy
*   **Minute-by-Minute (Scalping):**
    *   **Price Tick:** WebSockets feed real-time $USOIL prices into a memory buffer.
    *   **Astrological Delta:** Planetary movements are generally slow. However, the Ascendant (Rising Sign) and Midheaven change degrees very rapidly. We update these specific mathematical points every 1 minute.
*   **Hour-by-Hour (Intraday/Swing):**
    *   **Full Matrix Update:** Re-calculate aspects (Trine, Square, Conjunction) between major planets (Jupiter, Saturn, Pluto) as their influence spans longer timeframes.
    *   **Gemini Sentiment Refresh:** Scrape new macroeconomic news and generate a new Gemini prompt array to re-assess global sentiment (e.g., Middle East tensions).

### B. Normalization Format (The Unified Tick)
All inbound data streams are normalized into a standardized `UnifiedTick` object BEFORE entering the database:

```typescript
type UnifiedTick = {
  timestamp: string; // ISO 8601 UTC
  asset: "USOIL";
  price: { open: number, high: number, low: number, close: number, volume: number };
  astro: { sunDegree: number, moonPhase: number, ascendantDegree: number };
  sentimentScore: number; // -1.0 to 1.0 (from Gemini)
}
```

## 3. Storage and Database Strategy

Storing historical data is critical for the `runBacktest` and `analyzeCorrelations` modules. 

*   **Database Type:** Use a specialized Time-Series Database (TSDB) like InfluxDB or TimescaleDB. Firestore can be used as a document store but becomes expensive for million-row minute-ticks.
*   **Tiered Storage:**
    *   *Hot Data (Live)*: Redis in-memory cache for the last 24 hours of 1-minute ticks for instant AI querying.
    *   *Cold Data (Historical)*: TimescaleDB for the last 10 years of normalized Astro-Price ticks to perform deep statistical Pearson correlation mapping.

## 4. API Error Handling & Resilience

APIs are prone to rate limits (429), timeouts, and malformed responses.

*   **Exponential Backoff Strategy:** As seen in the `fetchWithRetry` wrapper, all outbound requests to Gemini, TradingView proxies, or AstroSeek APIs use exponential backoff.
*   **Circuit Breakers:** If an API fails consecutively >5 times, a circuit breaker trips. The system automatically degrades gracefully:
    *   *If Market API fails:* Use last known price and halt automated trade execution (kill-switch).
    *   *If Astro API fails:* Fallback to local mathematical approximations using standard ephemeris algorithms for a limited time (up to 24h).
    *   *If Gemini NLP fails:* Default sentiment to "Neutral" and warn the user.
*   **Dead Letter Queues (DLQ):** Missing or failed data fetching periods are logged to a DLQ. A scheduled chron job attempts to "gap-fill" missing historical periods during off-peak hours to maintain backtest integrity.

## Conclusion

This strategy ensures that the intersection of quantitative price action and qualitative esoterica is statistically rigorous, highly resilient to network interruptions, and prepared for direct execution through the defined Trading Strategy Framework.
