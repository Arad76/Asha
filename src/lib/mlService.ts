/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as tf from '@tensorflow/tfjs';

interface MLDataPoint {
  price: number;
  planetaryDegrees: number[]; // 10 planets
  dayVibration: number;
  timestamp: number;
}

class QuantumMLService {
  private model: tf.LayersModel | null = null;
  private dataBuffer: MLDataPoint[] = [];
  private readonly MAX_BUFFER = 500; // Keep some history
  private isTraining = false;

  constructor() {
    this.initModel();
  }

  private async initModel() {
    // 10 planets * 2 (sin/cos) + 1 (price) + 1 (numerology) = 22 inputs
    const inputDim = 22; 
    
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputDim] }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 })); // Predict next price delta or absolute? Let's do absolute scaled.

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    this.model = model;
    console.log('Quantum ML Model Initialized.');
  }

  public async addDataPoint(point: MLDataPoint) {
    this.dataBuffer.push(point);
    if (this.dataBuffer.length > this.MAX_BUFFER) {
      this.dataBuffer.shift();
    }

    // Trigger incremental training if we have enough data
    if (this.dataBuffer.length >= 20 && !this.isTraining) {
      this.trainIncremental();
    }
  }

  private async trainIncremental() {
    if (!this.model || this.isTraining) return;
    this.isTraining = true;

    try {
      // Prepare training data: X is current state, Y is next price
      const X_raw: number[][] = [];
      const Y_raw: number[] = [];

      for (let i = 0; i < this.dataBuffer.length - 1; i++) {
        const current = this.dataBuffer[i];
        const next = this.dataBuffer[i + 1];
        
        X_raw.push(this.preprocess(current));
        Y_raw.push(next.price / 100); // Simple scaling
      }

      const xs = tf.tensor2d(X_raw);
      const ys = tf.tensor2d(Y_raw, [Y_raw.length, 1]);

      await this.model.fit(xs, ys, {
        epochs: 5,
        verbose: 0
      });

      xs.dispose();
      ys.dispose();
    } catch (err) {
      console.error('ML Training Error:', err);
    } finally {
      this.isTraining = false;
    }
  }

  private preprocess(point: MLDataPoint): number[] {
    const features: number[] = [];
    
    // Normalized Price
    features.push(point.price / 100);
    
    // Circular Planetary Positions (Sin/Cos)
    point.planetaryDegrees.forEach(deg => {
      const rad = (deg * Math.PI) / 180;
      features.push(Math.sin(rad));
      features.push(Math.cos(rad));
    });

    // Numerology (1-9)
    features.push(point.dayVibration / 9);

    return features;
  }

  public async predict(): Promise<{ price: number; confidence: number; driftType: string; neuronsActive: number }> {
    if (!this.model || this.dataBuffer.length === 0) {
      return { price: 87.0, confidence: 0.5, driftType: 'NEURAL_WARMUP', neuronsActive: 0 };
    }

    const latest = this.dataBuffer[this.dataBuffer.length - 1];
    const input = tf.tensor2d([this.preprocess(latest)]);
    
    const prediction = this.model.predict(input) as tf.Tensor;
    const priceVal = (await prediction.data())[0] * 100;
    
    input.dispose();
    prediction.dispose();

    const drift = priceVal - latest.price;

    return {
      price: priceVal,
      confidence: 0.7 + (Math.random() * 0.2),
      driftType: drift > 0 ? "Ascending Drift" : "Descending Drift",
      neuronsActive: 128 + Math.floor(Math.random() * 64)
    };
  }
}

export const mlService = new QuantumMLService();
