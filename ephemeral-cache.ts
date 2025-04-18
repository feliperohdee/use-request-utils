import headers from 'use-request-utils/headers';
import includes from 'lodash/includes';
import now from 'lodash/now';
import startsWith from 'lodash/startsWith';
import trim from 'lodash/trim';

import { BROWSER } from './constants';
import util from './util';

namespace EphemeralCache {
	export type Item = {
		body: ArrayBuffer;
		headers: Headers;
		status: number;
		statusText: string;
		ts: number;
		ttlSeconds: number;
	};

	export type PendingPromise = Promise<Response>;
}

const CACHEABLE_CONTENT_TYPES = ['application/javascript', 'application/json', 'application/xml', 'application/yaml', 'text/'];
const MAX_TTL_SECONDS = 15; // 15 seconds

const getAgeSeconds = (ts: number) => {
	return (now() - ts) / 1000;
};

class EphemeralCache {
	private cache: Map<string, EphemeralCache.Item> = new Map();
	private pendingPromises: Map<string, EphemeralCache.PendingPromise> = new Map();

	constructor(options?: { autoCleanExpired?: boolean }) {
		if (options?.autoCleanExpired ?? true) {
			// clear expired cache every 15 seconds
			setInterval(() => {
				this.clearExpired();
			}, 15 * 1000);
		}

		if (BROWSER) {
			// @ts-ignore
			window['ephemeralCacheInstance'] = this;
		}
	}

	get(key: string, ttlSeconds: number = 0): Response | null {
		key = trim(key);

		if (!key) {
			return null;
		}

		const cached = this.cache.get(key);

		if (!cached) {
			return null;
		}

		const ageSeconds = getAgeSeconds(cached.ts);

		if (!ttlSeconds) {
			ttlSeconds = cached.ttlSeconds;
		}

		if (ageSeconds > ttlSeconds) {
			this.cache.delete(key);
			return null;
		}

		return new Response(cached.body, {
			headers: headers.merge(cached.headers, {
				'ephemeral-cache-age': `${ageSeconds}`,
				'ephemeral-cache-remaining-age': `${Math.max(0, ttlSeconds - ageSeconds)}`,
				'ephemeral-cache-status': 'HIT'
			}),
			status: cached.status,
			statusText: cached.statusText
		});
	}

	clear(): void {
		this.cache.clear();
		this.pendingPromises.clear();
	}

	clearExpired(): void {
		for (const [key, cached] of this.cache) {
			const ageSeconds = getAgeSeconds(cached.ts);

			if (ageSeconds > cached.ttlSeconds) {
				this.cache.delete(key);
			}
		}
	}

	delete(key: string): boolean {
		const cacheDeleted = this.cache.delete(key);
		const pendingDeleted = this.pendingPromises.delete(key);

		return cacheDeleted || pendingDeleted;
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	refreshTtl(key: string): void {
		const cached = this.cache.get(key);

		if (cached) {
			cached.ts = now();
		}
	}

	async set(key: string, response: Response, ttlSeconds: number = 0): Promise<void> {
		key = trim(key);
		ttlSeconds = Math.min(ttlSeconds, MAX_TTL_SECONDS);

		if (!key) {
			throw new Error('Invalid key');
		}

		if (!response.body) {
			return;
		}

		const ts = now();

		this.cache.set(key, {
			body: await util.readStreamToArrayBuffer(response.body),
			headers: headers.merge(response.headers, {
				'ephemeral-cache-ts': `${ts}`,
				'ephemeral-cache-ttl': `${ttlSeconds}`
			}),
			status: response.status,
			statusText: response.statusText,
			ts,
			ttlSeconds
		});

		// remove from pending cache if it exists
		this.pendingPromises.delete(key);
	}

	size(): number {
		return this.cache.size;
	}

	async wrap(
		key: string,
		fn: () => Promise<Response>,
		options: {
			refreshTtl?: boolean;
			ttlSeconds: number;
		}
	): Promise<Response> {
		const { refreshTtl = false, ttlSeconds = 0 } = options;

		key = trim(key);

		if (key && ttlSeconds > 0) {
			const cached = this.get(key);

			if (cached) {
				if (refreshTtl) {
					this.refreshTtl(key);
				}

				return cached;
			}

			const pendingPromise = this.pendingPromises.get(key);

			if (pendingPromise) {
				return (async () => {
					const res = await pendingPromise;

					return res.clone();
				})();
			}

			try {
				const promise = fn();
				this.pendingPromises.set(key, promise);

				const res = await promise;
				const contentType = res.headers.get('content-type') || '';
				const cacheable =
					!includes(contentType, 'stream') &&
					CACHEABLE_CONTENT_TYPES.some(type => {
						return startsWith(contentType, type);
					});

				if (cacheable && res.body) {
					await this.set(key, res.clone(), ttlSeconds);
				}

				// ensure all pending promises Response clones complete before returning main response
				// giving chance for pending microtasks to resolve before returning main response
				await Promise.resolve();

				return res;
			} finally {
				this.pendingPromises.delete(key);
			}
		}

		return fn();
	}
}

export { EphemeralCache };
export default new EphemeralCache();
