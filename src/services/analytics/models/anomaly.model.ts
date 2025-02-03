import { RandomForestClassifier as IsolationForest } from 'ml-random-forest';
import { Matrix } from 'ml-matrix';
import { Logger } from '../../../utils/Logger';

export interface AnomalyModelConfig {
  nEstimators: number;
  maxSamples: number;
  contamination: number;
  maxFeatures: number;
  threshold: number;
}

export interface AnomalyResult {
  anomalies: number[];
  scores: number[];
  confidence: number[];
  featureImportance: Record<string, number>;
}

export class AnomalyModel {
  private model: IsolationForest;
  private featureNames: string[] = [];
  private normalizers: Map<string, { mean: number; std: number }> = new Map();

  constructor(private config: AnomalyModelConfig) {
    this.model = new IsolationForest({
      nEstimators: config.nEstimators,
      maxFeatures: config.maxFeatures,
      seed: 42
    });
  }

  private normalizeFeatures(features: number[][]): number[][] {
    return features.map(row => 
      row.map((value, i) => {
        const featureName = this.featureNames[i];
        const stats = this.normalizers.get(featureName);
        if (!stats) return value;
        return (value - stats.mean) / stats.std;
      })
    );
  }

  private calculateStats(features: number[][]): void {
    const n = features[0].length;
    for (let i = 0; i < n; i++) {
      const values = features.map(row => row[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );
      this.normalizers.set(this.featureNames[i], { mean, std });
    }
  }

  public async train(features: number[][], featureNames: string[]): Promise<void> {
    try {
      this.featureNames = featureNames;
      this.calculateStats(features);
      const normalizedFeatures = this.normalizeFeatures(features);
      
      const matrix = new Matrix(normalizedFeatures);
      await this.model.train(matrix);
      
      Logger.info('Anomaly detection model trained successfully');
    } catch (error) {
      Logger.error('Error training anomaly detection model:', error);
      throw error;
    }
  }

  public async predict(features: number[][]): Promise<AnomalyResult> {
    try {
      const normalizedFeatures = this.normalizeFeatures(features);
      const matrix = new Matrix(normalizedFeatures, features[0].length);
      
      const scores = await this.model.predict(matrix);
      
      // Convert scores to anomalies (1 for anomaly, 0 for normal)
      const anomalies = scores.map(score => score < -this.config.threshold ? 1 : 0);
      
      // Calculate confidence based on distance from threshold
      const confidence = scores.map(score => 
        Math.min(Math.abs(score) / this.config.threshold, 1)
      );

      return {
        anomalies,
        scores,
        confidence,
        featureImportance: this.getFeatureImportance()
      };
    } catch (error) {
      Logger.error('Error making anomaly predictions:', error);
      throw error;
    }
  }

  public getModelCharacteristics(): Record<string, any> {
    return {
      algorithm: 'isolationForest',
      nEstimators: this.config.nEstimators,
      maxSamples: this.config.maxSamples,
      contamination: this.config.contamination,
      maxFeatures: this.config.maxFeatures,
      threshold: this.config.threshold,
      featureNames: this.featureNames,
      normalizers: Object.fromEntries(this.normalizers)
    };
  }

  public getFeatureImportance(): Record<string, number> {
    const importance: Record<string, number> = {};
    
    // Calculate feature importance based on model parameters
    const totalSamples = this.config.nEstimators * this.config.maxSamples;
    const featureWeights = (this.model.estimators || []).reduce((acc: number[], tree: any) => {
      const treeWeights = tree.featureImportances || new Array(this.featureNames.length).fill(1);
      return acc.map((weight, i) => weight + (treeWeights[i] || 0));
    }, new Array(this.featureNames.length).fill(0));

    // Normalize feature importance
    const totalImportance = featureWeights.reduce((sum: number, val: number) => sum + val, 0);
    this.featureNames.forEach((name, i) => {
      importance[name] = featureWeights[i] / (totalImportance || 1);
    });

    return importance;
  }

  public explainPrediction(features: number[], score: number): string[] {
    const importance = this.getFeatureImportance();
    const sortedFeatures = Object.entries(importance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const normalizedFeatures = this.normalizeFeatures([features])[0];
    const explanations: string[] = [];

    for (const [feature, imp] of sortedFeatures) {
      const index = this.featureNames.indexOf(feature);
      const value = normalizedFeatures[index];
      const stats = this.normalizers.get(feature)!;
      const originalValue = value * stats.std + stats.mean;

      if (Math.abs(value) > 2) {
        explanations.push(
          `${feature} value (${originalValue.toFixed(2)}) is unusually ${value > 0 ? 'high' : 'low'} ` +
          `(${Math.abs(value).toFixed(1)} standard deviations from mean)`
        );
      }
    }

    return explanations;
  }
} 