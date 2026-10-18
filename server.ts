/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { mlService } from "./src/lib/mlService.ts";
import { getPLANETARY_DATA } from "./src/lib/astrology.ts";
import { getDayNumerology } from "./src/lib/numerology.ts";
import { dataScanner } from "./src/lib/dataScanner.ts";
import { fetchMexcTicker } from "./src/lib/mexc.ts";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // ---- MEXC-backed trade-desk feed ----
  // The browser connects to MEXC directly; this is the server-side fallback for
  // the trade desk. It polls MEXC's public REST ticker (works once
  // contract.mexc.com is allow-listed in the environment's network settings)
  // and walks a local price otherwise, so the mark is never frozen.
  const DESK_SYMBOL = process.env.MEXC_SYMBOL || "BTC_USDT";
  let markPrice = 64000; // crypto-scale seed; replaced by the first live tick
  let mexcLive = false;

  setInterval(async () => {
    const t = await fetchMexcTicker(DESK_SYMBOL);
    if (t && t.lastPrice > 0) { markPrice = t.lastPrice; mexcLive = true; }
    else { mexcLive = false; }
  }, 3000);

  setInterval(() => {
    if (!mexcLive) {
      const z = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1; // ~normal
      markPrice = Math.max(0.0001, markPrice * (1 + 0.0015 * z));
    }
    io.emit("price-tick", {
      price: markPrice,
      symbol: DESK_SYMBOL,
      source: mexcLive ? "mexc" : "sim",
      timestamp: new Date().toISOString(),
    });
  }, 1000);

  // ML Data Ingestion Loop (Every 60 seconds / Minute-by-Minute)
  setInterval(async () => {
    try {
      const scan = await dataScanner.performScan();

      // Emit frequent market updates for the UI (oil/astro futures tape —
      // kept separate from the MEXC crypto trade-desk feed above).
      io.emit("market-update", {
        price: scan.price,
        futures: scan.futures,
        timestamp: scan.timestamp
      });

      const planets = scan.astrologicalResonance;
      const num = scan.numerology;

      await mlService.addDataPoint({
        price: scan.price,
        planetaryDegrees: planets.map((p: any) => p.degree + (p.minute / 60)),
        dayVibration: num.dayNumber,
        timestamp: new Date(scan.timestamp).getTime()
      });

      const prediction = await mlService.predict();
      io.emit("ml-prediction", {
        price: prediction.price,
        confidence: prediction.confidence,
        driftType: prediction.driftType,
        neuronsActive: prediction.neuronsActive,
        timestamp: scan.timestamp
      });
    } catch (err) {
      console.error("Quantum Data Scan error:", err);
    }
  }, 60000);

  // Signal Generator (Legacy Astrological Vibrations)
  setInterval(() => {
    const timeVib = Math.floor(Math.random() * 9) + 1;
    const priceVib = Math.floor(Math.random() * 9) + 1;
    const alignments = ["CONJUNCTION", "OPPOSITION", "SQUARE", "HARMONIC", "RESONANCE"];
    const alignment = alignments[Math.floor(Math.random() * alignments.length)];
    
    const confScores = ["High", "Medium", "Low"];
    const confidenceScore = confScores[Math.floor(Math.random() * confScores.length)];
    const impactHours = Math.floor(Math.random() * 4) + 1; // 1 to 4 hours

    io.emit("quantum-signal", {
      timeVibration: timeVib,
      priceVibration: priceVib,
      alignment,
      confidenceScore,
      impactHours,
      timestamp: new Date().toISOString()
    });
  }, 5000);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/quote', async (req, res) => {
    try {
      const scan = await dataScanner.performScan();
      res.json({ 
        price: scan.price,
        futures: scan.futures
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.json({ price: 87.00, futures: [] }); // strict fallback
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Quantum Engine running on http://localhost:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

startServer();
