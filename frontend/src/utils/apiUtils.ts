import { NetworkError } from './errors';

interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
  backoffFactor?: number;
}

interface CacheConfig {
  cacheDuration?: number; // in milliseconds
  cacheKey?: string;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffFactor: 2,
};

const defaultCacheConfig: CacheConfig = {
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Cache storage
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Check if online
const isOnline = () => navigator.onLine;

// Store pending requests when offline
const pendingRequests = new Map<string, { config: RequestInit; url: string }>();

// Listen for online status changes
window.addEventListener('online', async () => {
  console.log('Back online, processing pending requests...');
  for (const [key, request] of pendingRequests.entries()) {
    try {
      await fetchWithRetry(request.url, request.config);
      pendingRequests.delete(key);
    } catch (error) {
      console.error(`Failed to process pending request: ${key}`, error);
    }
  }
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string,
  config?: RequestInit,
  retryConfig: RetryConfig = defaultRetryConfig,
  cacheConfig: CacheConfig = defaultCacheConfig
) => {
  const { maxRetries = 3, delayMs = 1000, backoffFactor = 2 } = retryConfig;
  const { cacheDuration, cacheKey = url } = cacheConfig;

  // Check cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < (cacheDuration || defaultCacheConfig.cacheDuration!)) {
    return cachedData.data;
  }

  // If offline, store request for later
  if (!isOnline()) {
    pendingRequests.set(cacheKey, { config: config || {}, url });
    throw new NetworkError('You are offline. The request will be processed when you are back online.');
  }

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await delay(currentDelay);
        currentDelay *= backoffFactor;
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache successful response
      if (cacheDuration !== 0) {
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      
      // Don't retry on 4xx errors
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Request failed after all retry attempts');
};

export const clearCache = (cacheKey?: string) => {
  if (cacheKey) {
    apiCache.delete(cacheKey);
  } else {
    apiCache.clear();
  }
};

export const prefetchData = async (urls: string[]) => {
  return Promise.all(
    urls.map(url => fetchWithRetry(url, undefined, defaultRetryConfig, defaultCacheConfig))
  );
};

// Custom error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return `Error ${error.status}: ${error.message}`;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}; 