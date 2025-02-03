import { WebClient } from '@slack/web-api';
import { Logger } from '../../utils/Logger';
import { Alert } from '../alert/alert.service';

export interface SlackConfig {
  token: string;
  defaultChannel: string;
  rateLimits: {
    maxPerMinute: number;
    maxPerHour: number;
  };
  colors: {
    critical: string;
    warning: string;
    info: string;
    success: string;
  };
}

export class SlackService {
  private static instance: SlackService;
  private client: WebClient;
  private messagesSentLastMinute = 0;
  private messagesSentLastHour = 0;
  private lastMinuteReset: Date = new Date();
  private lastHourReset: Date = new Date();

  private constructor(private config: SlackConfig) {
    this.client = new WebClient(config.token);
    this.startRateLimitResetInterval();
  }

  public static getInstance(config?: SlackConfig): SlackService {
    if (!SlackService.instance && config) {
      SlackService.instance = new SlackService(config);
    }
    return SlackService.instance;
  }

  private startRateLimitResetInterval(): void {
    // Reset minute counter
    setInterval(() => {
      this.messagesSentLastMinute = 0;
      this.lastMinuteReset = new Date();
    }, 60000);

    // Reset hour counter
    setInterval(() => {
      this.messagesSentLastHour = 0;
      this.lastHourReset = new Date();
    }, 3600000);
  }

  private checkRateLimit(): boolean {
    const now = new Date();
    
    // Reset counters if needed
    if (now.getTime() - this.lastMinuteReset.getTime() > 60000) {
      this.messagesSentLastMinute = 0;
      this.lastMinuteReset = now;
    }
    if (now.getTime() - this.lastHourReset.getTime() > 3600000) {
      this.messagesSentLastHour = 0;
      this.lastHourReset = now;
    }

    return (
      this.messagesSentLastMinute < this.config.rateLimits.maxPerMinute &&
      this.messagesSentLastHour < this.config.rateLimits.maxPerHour
    );
  }

  private incrementRateLimit(): void {
    this.messagesSentLastMinute++;
    this.messagesSentLastHour++;
  }

  private getAlertColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return this.config.colors.critical;
      case 'warning':
        return this.config.colors.warning;
      case 'info':
        return this.config.colors.info;
      default:
        return this.config.colors.info;
    }
  }

  public async sendAlert(alert: Alert, channel?: string): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Slack rate limit exceeded');
        return false;
      }

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${alert.severity.toUpperCase()} Alert`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Message:*\n${alert.message}`
            },
            {
              type: 'mrkdwn',
              text: `*Component:*\n${alert.component}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Time:*\n<!date^${Math.floor(alert.timestamp.getTime() / 1000)}^{date_num} {time_secs}|${alert.timestamp.toISOString()}>`
            }
          ]
        }
      ];

      if (alert.metadata) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Additional Information:*\n' + 
              Object.entries(alert.metadata)
                .map(([key, value]) => `• ${key}: ${value}`)
                .join('\n'),
            emoji: true
          }
        });
      }

      await this.client.chat.postMessage({
        channel: channel || this.config.defaultChannel,
        blocks,
        attachments: [{
          color: this.getAlertColor(alert.severity)
        }]
      });

      this.incrementRateLimit();
      Logger.info(`Slack alert sent: ${alert.message}`);
      return true;
    } catch (error) {
      Logger.error('Error sending Slack alert:', error);
      return false;
    }
  }

  public async sendDailyReport(data: any, channel?: string): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Slack rate limit exceeded');
        return false;
      }

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 Daily System Report',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*System Status:*\n${data.systemHealth.status}`
            },
            {
              type: 'mrkdwn',
              text: `*Uptime:*\n${data.uptime}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*CPU Usage:*\n${data.metrics.system.cpu.average}% (avg)`
            },
            {
              type: 'mrkdwn',
              text: `*Memory Usage:*\n${data.metrics.system.memory.average}% (avg)`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Response Time:*\n${data.metrics.performance.responseTime.avg}ms (avg)`
            },
            {
              type: 'mrkdwn',
              text: `*Error Rate:*\n${data.metrics.performance.errorRate}%`
            }
          ]
        }
      ];

      if (data.alerts) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Alert Summary:*\n' +
              `• Critical: ${data.alerts.critical}\n` +
              `• Warning: ${data.alerts.warning}\n` +
              `• Info: ${data.alerts.info}`,
            emoji: true
          }
        });
      }

      await this.client.chat.postMessage({
        channel: channel || this.config.defaultChannel,
        blocks,
        attachments: [{
          color: this.config.colors.info
        }]
      });

      this.incrementRateLimit();
      Logger.info('Slack daily report sent');
      return true;
    } catch (error) {
      Logger.error('Error sending Slack daily report:', error);
      return false;
    }
  }

  public async sendWeeklyReport(data: any, channel?: string): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Slack rate limit exceeded');
        return false;
      }

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📈 Weekly System Report',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Period:* ${data.weekStart} - ${data.weekEnd}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Performance Metrics:*\n' +
                `• Avg Response Time: ${data.performance.responseTime.avg}ms (${data.performance.responseTime.change}%)\n` +
                `• Total Requests: ${data.performance.requests.total}\n` +
                `• Error Rate: ${data.performance.errorRate.avg}%`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Resource Usage:*\n' +
                `• CPU: ${data.resources.cpu.avg}% (${data.resources.cpu.change}%)\n` +
                `• Memory: ${data.resources.memory.avg}% (${data.resources.memory.change}%)\n` +
                `• Disk: ${data.resources.disk.used}/${data.resources.disk.total} GB`
            }
          ]
        }
      ];

      if (data.topIssues && data.topIssues.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Top Issues:*\n' +
              data.topIssues
                .map((issue: any) => `• ${issue.description} (${issue.count} occurrences)`)
                .join('\n')
          }
        });
      }

      await this.client.chat.postMessage({
        channel: channel || this.config.defaultChannel,
        blocks,
        attachments: [{
          color: this.config.colors.info
        }]
      });

      this.incrementRateLimit();
      Logger.info('Slack weekly report sent');
      return true;
    } catch (error) {
      Logger.error('Error sending Slack weekly report:', error);
      return false;
    }
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      await this.client.auth.test();
      return true;
    } catch (error) {
      Logger.error('Slack connection verification failed:', error);
      return false;
    }
  }
} 