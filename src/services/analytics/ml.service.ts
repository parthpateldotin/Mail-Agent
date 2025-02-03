import { Logger } from '../../utils/Logger';
import { MonitorService } from '../monitor/monitor.service';
import { AdvancedVisualizationService } from '../visualization/advanced.service';
import { EventEmitter } from 'events';
import { AnomalyModel } from './models/anomaly.model';
import { ClusteringModel } from './models/clustering.model';
import { ForecastingModel } from './models/forecasting.model';

export interface MLConfig {
  anomalyDetection: {
    nEstimators: number;
    maxSamples: number;
    contamination: number;
    maxFeatures: number;
    threshold: number;
  };
  clustering: {
    k: number;
    maxIterations: number;
    tolerance: number;
    distanceFunction: 'euclidean' | 'manhattan';
    seed: number;
  };
  forecasting: {
    method: 'linear' | 'polynomial';
    polynomialDegree?: number;
    windowSize: number;
    horizon: number;
    confidenceLevel: number;
  };
  trainingInterval: number; // in milliseconds
}

export interface MLAnalysisResult {
  anomalies: {
    detectedAnomalies: number[];
    anomalyScores: number[];
    featureImportance: Record<string, number>;
  };
  clusters: {
    assignments: number[];
    clusterMetrics: Array<{
      id: number;
      size: number;
      density: number;
      silhouetteScore: number;
    }>;
  };
  forecasts: {
    predictions: number[];
    confidenceIntervals: Array<{
      lower: number;
      upper: number;
    }>;
    trend: string;
    seasonality?: {
      period: number;
      strength: number;
    };
  };
}

export class MLService extends EventEmitter {
  private static instance: MLService;
  private anomalyModel: AnomalyModel;
  private clusteringModel: ClusteringModel;
  private forecastingModel: ForecastingModel;
  private lastTrainingTime: number = 0;
  private isTraining: boolean = false;

  private constructor(
    private config: MLConfig,
    private monitorService: MonitorService,
    private visualizationService: AdvancedVisualizationService
  ) {
    super();
    this.initializeModels();
    this.setupTrainingInterval();
  }

  public static getInstance(
    config: MLConfig,
    monitorService: MonitorService,
    visualizationService: AdvancedVisualizationService
  ): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService(config, monitorService, visualizationService);
    }
    return MLService.instance;
  }

  private initializeModels(): void {
    this.anomalyModel = new AnomalyModel(this.config.anomalyDetection);
    this.clusteringModel = new ClusteringModel(this.config.clustering);
    this.forecastingModel = new ForecastingModel(this.config.forecasting);
  }

  private setupTrainingInterval(): void {
    setInterval(async () => {
      await this.trainModels();
    }, this.config.trainingInterval);
  }

  private async shouldTrain(): Promise<boolean> {
    if (this.isTraining) return false;
    
    const currentTime = Date.now();
    if (currentTime - this.lastTrainingTime < this.config.trainingInterval) {
      return false;
    }

    const metrics = await this.monitorService.getMetrics();
    return metrics.length > 0;
  }

  private async trainModels(): Promise<void> {
    try {
      if (!await this.shouldTrain()) return;

      this.isTraining = true;
      const metrics = await this.monitorService.getMetrics();
      const features = this.prepareFeatures(metrics);
      const featureNames = Object.keys(metrics[0]).filter(key => 
        typeof metrics[0][key] === 'number'
      );

      // Train models
      await Promise.all([
        this.anomalyModel.train(features, featureNames),
        this.clusteringModel.train(features, featureNames),
        this.forecastingModel.train(features.map(row => row[0])) // Use first feature for forecasting
      ]);

      this.lastTrainingTime = Date.now();
      Logger.info('ML models trained successfully');
      this.emit('modelsUpdated');
    } catch (error) {
      Logger.error('Error training ML models:', error);
    } finally {
      this.isTraining = false;
    }
  }

  private prepareFeatures(metrics: any[]): number[][] {
    return metrics.map(metric => 
      Object.entries(metric)
        .filter(([_, value]) => typeof value === 'number')
        .map(([_, value]) => value as number)
    );
  }

  public async analyze(metrics: any[]): Promise<MLAnalysisResult> {
    try {
      const features = this.prepareFeatures(metrics);
      const featureNames = Object.keys(metrics[0]).filter(key => 
        typeof metrics[0][key] === 'number'
      );

      // Run all analyses in parallel
      const [anomalyResults, clusterResults, forecastResults] = await Promise.all([
        this.anomalyModel.predict(features),
        this.clusteringModel.predict(features),
        this.forecastingModel.predict(features.map(row => row[0])) // Use first feature for forecasting
      ]);

      // Update visualizations
      await this.visualizationService.updateMLInsights({
        anomalies: anomalyResults,
        clusters: clusterResults,
        forecasts: forecastResults
      });

      return {
        anomalies: {
          detectedAnomalies: anomalyResults.anomalies,
          anomalyScores: anomalyResults.scores,
          featureImportance: anomalyResults.featureImportance
        },
        clusters: {
          assignments: clusterResults.map(result => result.id),
          clusterMetrics: clusterResults.map(result => ({
            id: result.id,
            size: result.members.length,
            density: result.metrics.density,
            silhouetteScore: result.metrics.silhouetteScore
          }))
        },
        forecasts: {
          predictions: forecastResults.predictions,
          confidenceIntervals: forecastResults.confidenceIntervals,
          trend: forecastResults.trend,
          seasonality: forecastResults.seasonality
        }
      };
    } catch (error) {
      Logger.error('Error performing ML analysis:', error);
      throw error;
    }
  }

  public getModelInsights(): Record<string, any> {
    return {
      anomalyModel: this.anomalyModel.getModelCharacteristics(),
      clusteringModel: this.clusteringModel.getClusterCharacteristics(0), // Get insights for first cluster
      forecastingModel: this.forecastingModel.getModelCharacteristics()
    };
  }
} 