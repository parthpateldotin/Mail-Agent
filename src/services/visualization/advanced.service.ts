import { MonitorService } from '../monitor/monitor.service';
import { AlertService } from '../alert/alert.service';
import { Logger } from '../../utils/Logger';
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';

export interface AdvancedVisualizationConfig {
  websocket: {
    port: number;
    path: string;
  };
  anomalyDetection: {
    sensitivityThreshold: number;
    minDataPoints: number;
    trainingPeriod: number;
  };
  heatmap: {
    resolution: {
      x: number;
      y: number;
    };
    colorScale: string[];
  };
  correlation: {
    minCorrelation: number;
    maxLag: number;
  };
}

export interface AnomalyDetectionResult {
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  isAnomaly: boolean;
  confidence: number;
}

export interface HeatmapData {
  x: string[];
  y: string[];
  values: number[][];
  min: number;
  max: number;
}

export interface CorrelationResult {
  metric1: string;
  metric2: string;
  correlation: number;
  lag: number;
  significance: number;
}

export class AdvancedVisualizationService extends EventEmitter {
  private static instance: AdvancedVisualizationService;
  private monitorService: MonitorService;
  private alertService: AlertService;
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private anomalyModels: Map<string, any> = new Map();
  private metricHistory: Map<string, { timestamp: Date; value: number }[]> = new Map();
  private charts: Map<string, any> = new Map();

  private constructor(private config: AdvancedVisualizationConfig) {
    super();
    this.monitorService = MonitorService.getInstance();
    this.alertService = AlertService.getInstance();
    this.initializeWebSocket();
    this.startDataCollection();
  }

  public static getInstance(config?: AdvancedVisualizationConfig): AdvancedVisualizationService {
    if (!AdvancedVisualizationService.instance && config) {
      AdvancedVisualizationService.instance = new AdvancedVisualizationService(config);
    }
    return AdvancedVisualizationService.instance;
  }

  private initializeWebSocket(): void {
    this.wss = new WebSocket.Server({
      port: this.config.websocket.port,
      path: this.config.websocket.path
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          Logger.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial data
      this.sendInitialData(ws);
    });
  }

  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      const [metrics, anomalies, correlations] = await Promise.all([
        this.getLatestMetrics(),
        this.detectAnomalies(),
        this.findCorrelations()
      ]);

      ws.send(JSON.stringify({
        type: 'initial',
        data: {
          metrics,
          anomalies,
          correlations
        }
      }));
    } catch (error) {
      Logger.error('Error sending initial data:', error);
    }
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        // Handle metric subscription
        break;
      case 'unsubscribe':
        // Handle metric unsubscription
        break;
      case 'requestUpdate':
        this.sendMetricUpdate(ws);
        break;
      default:
        Logger.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private async startDataCollection(): Promise<void> {
    // Collect data every 5 seconds
    setInterval(async () => {
      try {
        const metrics = await this.getLatestMetrics();
        this.updateMetricHistory(metrics);
        
        const [anomalies, correlations] = await Promise.all([
          this.detectAnomalies(),
          this.findCorrelations()
        ]);

        this.broadcastUpdate({
          metrics,
          anomalies,
          correlations
        });
      } catch (error) {
        Logger.error('Error collecting metrics:', error);
      }
    }, 5000);
  }

  private async getLatestMetrics(): Promise<any> {
    const [systemMetrics, performanceMetrics] = await Promise.all([
      this.monitorService.getSystemMetrics(),
      this.monitorService.getPerformanceMetrics()
    ]);

    return {
      system: systemMetrics,
      performance: performanceMetrics
    };
  }

  private updateMetricHistory(metrics: any): void {
    const timestamp = new Date();
    const flatMetrics = this.flattenMetrics(metrics);

    for (const [key, value] of Object.entries(flatMetrics)) {
      if (!this.metricHistory.has(key)) {
        this.metricHistory.set(key, []);
      }

      const history = this.metricHistory.get(key)!;
      history.push({ timestamp, value: value as number });

      // Keep last 24 hours of data
      const cutoff = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
      while (history.length > 0 && history[0].timestamp < cutoff) {
        history.shift();
      }
    }
  }

  private flattenMetrics(metrics: any, prefix = ''): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [key, value] of Object.entries(metrics)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'number') {
        result[fullKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(result, this.flattenMetrics(value, fullKey));
      }
    }

    return result;
  }

  private async detectAnomalies(): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    for (const [metric, history] of this.metricHistory.entries()) {
      if (history.length < this.config.anomalyDetection.minDataPoints) {
        continue;
      }

      const values = history.map(h => h.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );

      const latest = history[history.length - 1];
      const deviation = Math.abs(latest.value - mean) / stdDev;

      if (deviation > this.config.anomalyDetection.sensitivityThreshold) {
        anomalies.push({
          timestamp: latest.timestamp,
          metric,
          value: latest.value,
          expected: mean,
          deviation,
          isAnomaly: true,
          confidence: this.calculateConfidence(deviation)
        });
      }
    }

    return anomalies;
  }

  private calculateConfidence(deviation: number): number {
    // Convert deviation to confidence score between 0 and 1
    return Math.min(Math.max(
      (deviation - this.config.anomalyDetection.sensitivityThreshold) / 2,
      0
    ), 1);
  }

  private async findCorrelations(): Promise<CorrelationResult[]> {
    const correlations: CorrelationResult[] = [];
    const metrics = Array.from(this.metricHistory.keys());

    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];

        const correlation = await this.calculateCorrelation(metric1, metric2);
        if (Math.abs(correlation.correlation) >= this.config.correlation.minCorrelation) {
          correlations.push(correlation);
        }
      }
    }

    return correlations;
  }

  private async calculateCorrelation(metric1: string, metric2: string): Promise<CorrelationResult> {
    const history1 = this.metricHistory.get(metric1)!;
    const history2 = this.metricHistory.get(metric2)!;

    const values1 = history1.map(h => h.value);
    const values2 = history2.map(h => h.value);

    let maxCorrelation = 0;
    let bestLag = 0;

    // Calculate cross-correlation with different lags
    for (let lag = 0; lag <= this.config.correlation.maxLag; lag++) {
      const correlation = this.pearsonCorrelation(
        values1.slice(lag),
        values2.slice(0, values2.length - lag)
      );

      if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    return {
      metric1,
      metric2,
      correlation: maxCorrelation,
      lag: bestLag,
      significance: this.calculateSignificance(maxCorrelation, values1.length)
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_x2 = 0;
    let sum_y2 = 0;

    for (let i = 0; i < n; i++) {
      sum_x += x[i];
      sum_y += y[i];
      sum_xy += x[i] * y[i];
      sum_x2 += x[i] * x[i];
      sum_y2 += y[i] * y[i];
    }

    const denominator = Math.sqrt(
      (n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)
    );

    if (denominator === 0) return 0;

    return (n * sum_xy - sum_x * sum_y) / denominator;
  }

  private calculateSignificance(correlation: number, n: number): number {
    // Calculate t-statistic
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    // Convert to p-value (simplified)
    return 1 - Math.min(Math.abs(t) / Math.sqrt(n), 1);
  }

  public generateHeatmap(metric: string): HeatmapData {
    const history = this.metricHistory.get(metric);
    if (!history) {
      throw new Error(`No data available for metric: ${metric}`);
    }

    const { x: xRes, y: yRes } = this.config.heatmap.resolution;
    const values: number[][] = Array(yRes).fill(0).map(() => Array(xRes).fill(0));
    
    // Group data points into bins
    const timeRange = history[history.length - 1].timestamp.getTime() - history[0].timestamp.getTime();
    const valueRange = Math.max(...history.map(h => h.value)) - Math.min(...history.map(h => h.value));
    
    for (const point of history) {
      const x = Math.floor((point.timestamp.getTime() - history[0].timestamp.getTime()) / timeRange * (xRes - 1));
      const y = Math.floor((point.value - Math.min(...history.map(h => h.value))) / valueRange * (yRes - 1));
      values[y][x]++;
    }

    return {
      x: Array(xRes).fill(0).map((_, i) => new Date(history[0].timestamp.getTime() + i * timeRange / (xRes - 1)).toISOString()),
      y: Array(yRes).fill(0).map((_, i) => (Math.min(...history.map(h => h.value)) + i * valueRange / (yRes - 1)).toFixed(2)),
      values,
      min: Math.min(...values.flat()),
      max: Math.max(...values.flat())
    };
  }

  private broadcastUpdate(data: any): void {
    const message = JSON.stringify({
      type: 'update',
      data,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  private async sendMetricUpdate(ws: WebSocket): Promise<void> {
    try {
      const metrics = await this.getLatestMetrics();
      ws.send(JSON.stringify({
        type: 'metricUpdate',
        data: metrics,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      Logger.error('Error sending metric update:', error);
    }
  }

  public async stop(): Promise<void> {
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.wss.close();
    }
  }

  public async updateMLInsights(insights: {
    anomalies: {
      anomalies: boolean[];
      scores: number[];
      featureImportance: Record<string, number>;
    };
    clusters: Array<{
      id: number;
      centroid: number[];
      members: number[];
      metrics: {
        silhouetteScore: number;
        density: number;
        radius: number;
      };
    }>;
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
  }): Promise<void> {
    try {
      // Update anomaly visualizations
      await this.updateAnomalyVisualizations(insights.anomalies);

      // Update cluster visualizations
      await this.updateClusterVisualizations(insights.clusters);

      // Update forecast visualizations
      await this.updateForecastVisualizations(insights.forecasts);

      Logger.info('ML insights visualizations updated successfully');
    } catch (error) {
      Logger.error('Error updating ML insights visualizations:', error);
      throw error;
    }
  }

  private async updateAnomalyVisualizations(anomalies: {
    anomalies: boolean[];
    scores: number[];
    featureImportance: Record<string, number>;
  }): Promise<void> {
    // Update anomaly score timeline
    await this.updateChart('anomaly-scores', {
      data: anomalies.scores,
      type: 'line',
      options: {
        title: 'Anomaly Scores Over Time',
        yAxis: { title: 'Score' }
      }
    });

    // Update feature importance bar chart
    await this.updateChart('feature-importance', {
      data: Object.entries(anomalies.featureImportance).map(([feature, importance]) => ({
        x: feature,
        y: importance
      })),
      type: 'bar',
      options: {
        title: 'Feature Importance',
        yAxis: { title: 'Importance Score' }
      }
    });
  }

  private async updateClusterVisualizations(clusters: Array<{
    id: number;
    centroid: number[];
    members: number[];
    metrics: {
      silhouetteScore: number;
      density: number;
      radius: number;
    };
  }>): Promise<void> {
    // Update cluster scatter plot
    await this.updateChart('cluster-scatter', {
      data: clusters.map(cluster => ({
        x: cluster.centroid[0],
        y: cluster.centroid[1],
        size: cluster.members.length,
        id: cluster.id
      })),
      type: 'scatter',
      options: {
        title: 'Cluster Distribution',
        xAxis: { title: 'Feature 1' },
        yAxis: { title: 'Feature 2' }
      }
    });

    // Update cluster metrics
    await this.updateChart('cluster-metrics', {
      data: clusters.map(cluster => ({
        id: cluster.id,
        silhouette: cluster.metrics.silhouetteScore,
        density: cluster.metrics.density,
        radius: cluster.metrics.radius
      })),
      type: 'table',
      options: {
        title: 'Cluster Metrics'
      }
    });
  }

  private async updateForecastVisualizations(forecast: {
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
  }): Promise<void> {
    // Update forecast line chart with confidence intervals
    await this.updateChart('forecast', {
      data: {
        predictions: forecast.predictions,
        lower: forecast.confidenceIntervals.map(ci => ci.lower),
        upper: forecast.confidenceIntervals.map(ci => ci.upper)
      },
      type: 'line',
      options: {
        title: 'Forecast with Confidence Intervals',
        yAxis: { title: 'Value' }
      }
    });

    // Update seasonality information if available
    if (forecast.seasonality) {
      await this.updateChart('seasonality', {
        data: {
          period: forecast.seasonality.period,
          strength: forecast.seasonality.strength
        },
        type: 'info',
        options: {
          title: 'Seasonality Analysis'
        }
      });
    }
  }

  private async updateChart(
    chartId: string,
    config: {
      data: any;
      type: 'line' | 'bar' | 'scatter' | 'table' | 'info';
      options: {
        title: string;
        xAxis?: { title: string };
        yAxis?: { title: string };
      };
    }
  ): Promise<void> {
    try {
      let chart = this.charts.get(chartId);
      
      if (!chart) {
        chart = await this.createChart(chartId, config.type);
        this.charts.set(chartId, chart);
      }

      await chart.update(config.data, config.options);
      Logger.info(`Chart ${chartId} updated successfully`);
    } catch (error) {
      Logger.error(`Error updating chart ${chartId}:`, error);
      throw error;
    }
  }

  private async createChart(chartId: string, type: string): Promise<any> {
    try {
      const element = document.getElementById(chartId);
      if (!element) {
        throw new Error(`Element with id ${chartId} not found`);
      }

      // Create chart based on type
      const chart = await this.createChartByType(type, element);
      return chart;
    } catch (error) {
      Logger.error(`Error creating chart ${chartId}:`, error);
      throw error;
    }
  }

  private async createChartByType(type: string, element: HTMLElement): Promise<any> {
    switch (type) {
      case 'line':
        return this.createLineChart(element);
      case 'bar':
        return this.createBarChart(element);
      case 'scatter':
        return this.createScatterPlot(element);
      case 'table':
        return this.createDataTable(element);
      case 'info':
        return this.createInfoPanel(element);
      default:
        throw new Error(`Unsupported chart type: ${type}`);
    }
  }

  private async createLineChart(element: HTMLElement): Promise<any> {
    // Implement line chart creation
    return {};
  }

  private async createBarChart(element: HTMLElement): Promise<any> {
    // Implement bar chart creation
    return {};
  }

  private async createScatterPlot(element: HTMLElement): Promise<any> {
    // Implement scatter plot creation
    return {};
  }

  private async createDataTable(element: HTMLElement): Promise<any> {
    // Implement data table creation
    return {};
  }

  private async createInfoPanel(element: HTMLElement): Promise<any> {
    // Implement info panel creation
    return {};
  }
} 