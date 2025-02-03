import { KMeans } from 'ml-kmeans';
import { Matrix } from 'ml-matrix';
import { Logger } from '../../../utils/Logger';

export interface ClusteringModelConfig {
  k: number;
  maxIterations: number;
  tolerance: number;
  distanceFunction: 'euclidean' | 'manhattan';
  seed: number;
}

export interface ClusterResult {
  id: number;
  centroid: number[];
  members: number[];
  metrics: {
    silhouetteScore: number;
    density: number;
    radius: number;
  };
}

export class ClusteringModel {
  private model: KMeans;
  private featureNames: string[] = [];
  private normalizers: Map<string, { mean: number; std: number }> = new Map();
  private lastCentroids: number[][] = [];
  private lastAssignments: number[] = [];

  constructor(private config: ClusteringModelConfig) {
    this.model = new KMeans(config.k, {
      maxIterations: config.maxIterations,
      tolerance: config.tolerance,
      distanceFunction: config.distanceFunction === 'euclidean' ? 
        (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, x, i) => sum + Math.pow(x - b[i], 2), 0)) :
        (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0),
      seed: config.seed
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

  private calculateSilhouetteScore(features: number[][], assignments: number[]): number {
    let totalScore = 0;
    const n = features.length;

    for (let i = 0; i < n; i++) {
      const a = this.calculateAverageIntraClusterDistance(i, features, assignments);
      const b = this.calculateMinInterClusterDistance(i, features, assignments);
      const silhouette = (b - a) / Math.max(a, b);
      totalScore += silhouette;
    }

    return totalScore / n;
  }

  private calculateAverageIntraClusterDistance(
    pointIndex: number,
    features: number[][],
    assignments: number[]
  ): number {
    const cluster = assignments[pointIndex];
    const clusterPoints = features.filter((_, i) => 
      assignments[i] === cluster && i !== pointIndex
    );

    if (clusterPoints.length === 0) return 0;

    const distances = clusterPoints.map(point =>
      this.calculateDistance(features[pointIndex], point)
    );

    return distances.reduce((a, b) => a + b, 0) / distances.length;
  }

  private calculateMinInterClusterDistance(
    pointIndex: number,
    features: number[][],
    assignments: number[]
  ): number {
    const cluster = assignments[pointIndex];
    const otherClusters = [...new Set(assignments)].filter(c => c !== cluster);

    const minDistances = otherClusters.map(otherCluster => {
      const clusterPoints = features.filter((_, i) => assignments[i] === otherCluster);
      const distances = clusterPoints.map(point =>
        this.calculateDistance(features[pointIndex], point)
      );
      return Math.min(...distances);
    });

    return Math.min(...minDistances);
  }

  private calculateDistance(a: number[], b: number[]): number {
    return this.config.distanceFunction === 'euclidean'
      ? Math.sqrt(a.reduce((sum, x, i) => sum + Math.pow(x - b[i], 2), 0))
      : a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0);
  }

  private calculateClusterMetrics(
    features: number[][],
    assignments: number[],
    centroids: number[][]
  ): Map<number, { density: number; radius: number }> {
    const metrics = new Map<number, { density: number; radius: number }>();

    for (let clusterId = 0; clusterId < this.config.k; clusterId++) {
      const clusterPoints = features.filter((_, i) => assignments[i] === clusterId);
      const centroid = centroids[clusterId];

      // Calculate radius (maximum distance from centroid)
      const radius = Math.max(
        ...clusterPoints.map(point => this.calculateDistance(point, centroid))
      );

      // Calculate density (points per unit volume)
      const volume = Math.pow(radius, features[0].length);
      const density = clusterPoints.length / (volume || 1);

      metrics.set(clusterId, { density, radius });
    }

    return metrics;
  }

  public async train(features: number[][], featureNames: string[]): Promise<void> {
    try {
      this.featureNames = featureNames;
      this.calculateStats(features);
      const normalizedFeatures = this.normalizeFeatures(features);
      
      const matrix = new Matrix(normalizedFeatures);
      const result = await this.model.train(matrix);
      
      this.lastCentroids = result.centroids;
      this.lastAssignments = result.clusters;
      
      Logger.info('Clustering model trained successfully');
    } catch (error) {
      Logger.error('Error training clustering model:', error);
      throw error;
    }
  }

  public async predict(features: number[][]): Promise<ClusterResult[]> {
    try {
      const normalizedFeatures = this.normalizeFeatures(features);
      const matrix = new Matrix(normalizedFeatures);
      
      const assignments = await this.model.predict(matrix);
      const metrics = this.calculateClusterMetrics(
        normalizedFeatures,
        assignments,
        this.lastCentroids
      );

      const silhouetteScore = this.calculateSilhouetteScore(
        normalizedFeatures,
        assignments
      );

      return Array.from({ length: this.config.k }, (_, i) => ({
        id: i,
        centroid: this.lastCentroids[i],
        members: assignments
          .map((cluster, index) => (cluster === i ? index : -1))
          .filter(index => index !== -1),
        metrics: {
          silhouetteScore,
          ...metrics.get(i)!
        }
      }));
    } catch (error) {
      Logger.error('Error making cluster predictions:', error);
      throw error;
    }
  }

  public getClusterCharacteristics(clusterId: number): Record<string, any> {
    const clusterPoints = this.lastAssignments
      .map((cluster, index) => (cluster === clusterId ? index : -1))
      .filter(index => index !== -1);

    const characteristics: Record<string, any> = {
      size: clusterPoints.length,
      centroid: this.lastCentroids[clusterId].map((value, i) => ({
        feature: this.featureNames[i],
        value: this.denormalizeValue(value, this.featureNames[i])
      }))
    };

    // Add feature distributions
    this.featureNames.forEach((feature, i) => {
      const values = clusterPoints.map(pointIndex => 
        this.denormalizeValue(this.lastCentroids[clusterId][i], feature)
      );

      characteristics[`${feature}_mean`] = 
        values.reduce((a, b) => a + b, 0) / values.length;
      characteristics[`${feature}_std`] = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - characteristics[`${feature}_mean`], 2), 0) / 
        values.length
      );
    });

    return characteristics;
  }

  private denormalizeValue(value: number, feature: string): number {
    const stats = this.normalizers.get(feature);
    if (!stats) return value;
    return value * stats.std + stats.mean;
  }
} 