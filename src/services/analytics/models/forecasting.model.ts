import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';
import { Matrix } from 'ml-matrix';
import { Logger } from '../../../utils/Logger';

export interface ForecastingModelConfig {
  method: 'linear' | 'polynomial';
  polynomialDegree?: number;
  windowSize: number;
  horizon: number;
  confidenceLevel: number;
}

export interface ForecastResult {
  predictions: number[];
  confidenceIntervals: Array<{
    lower: number;
    upper: number;
  }>;
  metrics: {
    mse: number;
    mae: number;
    r2: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: {
    period: number;
    strength: number;
  };
}

export class ForecastingModel {
  private model: SimpleLinearRegression | PolynomialRegression;
  private normalizer: { mean: number; std: number } | null = null;
  private lastTrainingData: { x: number[]; y: number[] } = { x: [], y: [] };

  constructor(private config: ForecastingModelConfig) {
    if (config.method === 'polynomial' && !config.polynomialDegree) {
      throw new Error('Polynomial degree must be specified for polynomial regression');
    }
  }

  private normalizeValues(values: number[]): number[] {
    if (!this.normalizer) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );
      this.normalizer = { mean, std };
    }
    return values.map(v => (v - this.normalizer!.mean) / this.normalizer!.std);
  }

  private denormalizeValues(values: number[]): number[] {
    if (!this.normalizer) return values;
    return values.map(v => v * this.normalizer!.std + this.normalizer!.mean);
  }

  private createTimeSeriesFeatures(data: number[]): { x: number[]; y: number[] } {
    const x: number[] = [];
    const y: number[] = [];

    for (let i = 0; i <= data.length - this.config.windowSize; i++) {
      x.push(i);
      y.push(data[i + this.config.windowSize - 1]);
    }

    return { x, y };
  }

  private calculateMetrics(actual: number[], predicted: number[]): {
    mse: number;
    mae: number;
    r2: number;
  } {
    const n = actual.length;
    const mean = actual.reduce((a, b) => a + b, 0) / n;

    const mse = actual.reduce((sum, val, i) => 
      sum + Math.pow(val - predicted[i], 2), 0) / n;

    const mae = actual.reduce((sum, val, i) =>
      sum + Math.abs(val - predicted[i]), 0) / n;

    const tss = actual.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0);
    const rss = actual.reduce((sum, val, i) =>
      sum + Math.pow(val - predicted[i], 2), 0);
    const r2 = 1 - (rss / tss);

    return { mse, mae, r2 };
  }

  private detectSeasonality(data: number[]): { period: number; strength: number } | undefined {
    if (data.length < 4) return undefined;

    const maxPeriod = Math.floor(data.length / 2);
    let bestPeriod = 1;
    let maxAutocorrelation = -1;

    for (let period = 2; period <= maxPeriod; period++) {
      let autocorrelation = 0;
      let n = 0;

      for (let i = 0; i < data.length - period; i++) {
        autocorrelation += data[i] * data[i + period];
        n++;
      }

      autocorrelation /= n;
      if (autocorrelation > maxAutocorrelation) {
        maxAutocorrelation = autocorrelation;
        bestPeriod = period;
      }
    }

    const strength = maxAutocorrelation / 
      (data.reduce((sum, val) => sum + val * val, 0) / data.length);

    return strength > 0.1 ? { period: bestPeriod, strength } : undefined;
  }

  private calculateConfidenceIntervals(
    predictions: number[],
    mse: number
  ): Array<{ lower: number; upper: number }> {
    const criticalValue = 1.96; // 95% confidence level
    const standardError = Math.sqrt(mse);

    return predictions.map(prediction => {
      const margin = criticalValue * standardError;
      return {
        lower: prediction - margin,
        upper: prediction + margin
      };
    });
  }

  private determineTrend(predictions: number[]): 'increasing' | 'decreasing' | 'stable' {
    const slope = (predictions[predictions.length - 1] - predictions[0]) / 
      predictions.length;
    
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  public async train(data: number[]): Promise<void> {
    try {
      const normalizedData = this.normalizeValues(data);
      const { x, y } = this.createTimeSeriesFeatures(normalizedData);
      this.lastTrainingData = { x, y };

      if (this.config.method === 'linear') {
        this.model = new SimpleLinearRegression(x, y);
      } else {
        this.model = new PolynomialRegression(x, y, this.config.polynomialDegree!);
      }

      Logger.info('Forecasting model trained successfully');
    } catch (error) {
      Logger.error('Error training forecasting model:', error);
      throw error;
    }
  }

  public async predict(data: number[]): Promise<ForecastResult> {
    try {
      const normalizedData = this.normalizeValues(data);
      const futureDates = Array.from(
        { length: this.config.horizon },
        (_, i) => this.lastTrainingData.x.length + i
      );

      const normalizedPredictions = futureDates.map(x => this.model.predict(x));
      const predictions = this.denormalizeValues(normalizedPredictions);

      // Calculate metrics using the last window of actual data
      const lastWindow = data.slice(-this.config.windowSize);
      const fittedValues = this.lastTrainingData.x
        .map(x => this.model.predict(x));
      const denormalizedFitted = this.denormalizeValues(fittedValues);
      const metrics = this.calculateMetrics(lastWindow, 
        denormalizedFitted.slice(-this.config.windowSize));

      const confidenceIntervals = this.calculateConfidenceIntervals(
        predictions,
        metrics.mse
      );

      const trend = this.determineTrend(predictions);
      const seasonality = this.detectSeasonality(data);

      return {
        predictions,
        confidenceIntervals,
        metrics,
        trend,
        seasonality
      };
    } catch (error) {
      Logger.error('Error making forecast predictions:', error);
      throw error;
    }
  }

  public getModelCharacteristics(): Record<string, any> {
    const characteristics: Record<string, any> = {
      method: this.config.method,
      windowSize: this.config.windowSize,
      horizon: this.config.horizon
    };

    if (this.config.method === 'polynomial') {
      characteristics.degree = this.config.polynomialDegree;
    }

    if (this.model instanceof SimpleLinearRegression) {
      characteristics.slope = this.model.slope;
      characteristics.intercept = this.model.intercept;
    }

    return characteristics;
  }
} 