/**
 * Centralized Axios instance factory for Kaiten API
 *
 * Uses a custom bridge adapter to proxy requests through Kotlin/OkHttp,
 * bypassing CORS restrictions that block direct fetch() from null origin (JCEF file:// context).
 *
 * Flow: axios.get(path) → bridgeAdapter → bridge.call('apiRequest', { url }) → OkHttp → Kaiten API
 */

import axios, {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosInstance,
} from 'axios';

import { bridge } from '@/bridge/JCEFBridge';

import type { ApiConfig } from './client';

/**
 * Custom axios adapter that routes requests through the JCEF bridge.
 *
 * Converts an axios request config into a bridge.call('apiRequest', { url }) call,
 * then maps the bridge result back to an AxiosResponse (or throws an AxiosError).
 * This lets client.ts use standard axios error handling (isAxiosError, error.response.status).
 */
const bridgeAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => {
  // Build full URL: baseURL + path + serialized query params
  const url = axios.getUri(config);

  let result: Awaited<ReturnType<typeof bridge.call<'apiRequest'>>>;
  try {
    result = await bridge.call(
      'apiRequest',
      { url },
      { signal: config.signal as AbortSignal | undefined },
    );
  } catch (bridgeError) {
    // AbortSignal fired — translate to axios cancellation so TanStack Query handles it correctly
    if (bridgeError instanceof DOMException && bridgeError.name === 'AbortError') {
      throw new CanceledError('canceled', AxiosError.ERR_CANCELED, config);
    }
    console.error('[bridgeAdapter] bridge.call threw:', bridgeError);
    throw new AxiosError(
      bridgeError instanceof Error ? bridgeError.message : 'Bridge error',
      'ERR_NETWORK',
      config,
    );
  }

  if (result.ok) {
    return {
      data: result.body,
      status: result.status,
      statusText: String(result.status),
      headers: {},
      config,
    };
  }

  const { status, message } = result;

  // status <= 0 means no HTTP response (network failure or timeout)
  if (status <= 0) {
    const isTimeout = message.toLowerCase().includes('timeout');
    throw new AxiosError(message, isTimeout ? 'ECONNABORTED' : 'ERR_NETWORK', config);
  }

  // HTTP error (4xx / 5xx) — include response so error.response.status works in client.ts
  const errorResponse: AxiosResponse = {
    data: { message },
    status,
    statusText: message,
    headers: {},
    config,
  };
  throw new AxiosError(message, 'ERR_BAD_RESPONSE', config, undefined, errorResponse);
};

/**
 * Creates an axios instance pre-configured with Kaiten API credentials.
 *
 * Uses bridgeAdapter as transport — all requests go through Kotlin/OkHttp.
 * Use relative paths without a leading slash:
 *   instance.get('spaces')
 *   instance.get(`spaces/${id}/boards`)
 */
export function createKaitenAxios(config: ApiConfig): AxiosInstance {
  const baseURL = config.serverUrl.replace(/\/$/, '') + '/';

  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
    adapter: bridgeAdapter,
  });
}
