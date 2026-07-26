export type ModuleHealthStatus = 'export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?:export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: numberexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRAexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health checkexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available':export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slowerexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url:export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortControllerexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUTexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode:export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal:export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.nowexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors modeexport type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0.
    // A resolved response (export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0.
    // A resolved response (even opaque) means the server is reachable.
    const status: ModuleHealthStatus =export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0.
    // A resolved response (even opaque) means the server is reachable.
    const status: ModuleHealthStatus =
      elapsed > DEGRADED_THRESHOLD ? 'degraded' : 'available';
export type ModuleHealthStatus = 'available' | 'degraded' | 'unavailable' | 'checking' | 'unknown';

export interface ModuleHealthResult {
  status: ModuleHealthStatus;
  /** Response time in milliseconds, undefined if not checked */
  responseTime?: number;
  /** Timestamp when the check was performed */
  checkedAt?: number;
}

const HEALTH_CHECK_TIMEOUT = 5000;
const DEGRADED_THRESHOLD = 3000;

/**
 * Perform a lightweight health check for a module URL.
 * Uses HEAD request to minimize overhead.
 * - 'available': responded within DEGRADED_THRESHOLD
 * - 'degraded': responded but slower than DEGRADED_THRESHOLD
 * - 'unavailable': network error or non-2xx status
 */
export const checkModuleHealth = async (
  url: string
): Promise<ModuleHealthResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0.
    // A resolved response (even opaque) means the server is reachable.
    const status: ModuleHealthStatus =
      elapsed > DEGRADED_THRESHOLD ? 'degraded' : 'available';

    return { status, responseTime: elapsed, checkedAt: Date.now() };
  } catch (error) {
    clearTimeout(timeoutId);

    // AbortError