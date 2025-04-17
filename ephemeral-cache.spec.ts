import _ from 'lodash';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';

import { EphemeralCache } from './ephemeral-cache';
import headers from './headers';
import util from './util';

describe('/ephemeral-cache', () => {
	let cache: EphemeralCache;

	beforeEach(() => {
		cache = new EphemeralCache();
	});

	describe('clear', () => {
		it('should clear all items', async () => {
			await cache.set('key1', new Response('cached value1'));
			await cache.set('key2', new Response('cached value2'));

			cache.clear();

			expect(cache.get('key1')).toBeNull();
			expect(cache.get('key2')).toBeNull();
			expect(cache.size()).toEqual(0);
		});
	});

	describe('clearExpired', () => {
		it('should clear expired items', async () => {
			await cache.set('key1', new Response('cached value1'), 0.5);
			await cache.set('key2', new Response('cached value2'), 0.5);
			await util.wait(501);

			cache.clearExpired();

			expect(cache.size()).toEqual(0);
		});
	});

	describe('delete', () => {
		it('should delete specific item', async () => {
			await cache.set('key1', new Response('cached value1'), 0.5);
			await cache.set('key2', new Response('cached value2'), 0.5);

			cache.delete('key1');

			expect(cache.get('key1')).toBeNull();
			expect(cache.get('key2')).toBeInstanceOf(Response);
		});
	});

	describe('get and set', () => {
		it('should not store if null body', async () => {
			await cache.set('key', new Response(null), 0.5);

			const res = cache.get('key');
			expect(res).toBeNull();
		});

		it('should store and retrieve a response', async () => {
			await cache.set('key', new Response('value'), 0.5);

			const res = cache.get('key');

			expect(await res!.text()).toEqual('value');
			expect(headers.toJson(res!.headers)).toEqual({
				'content-type': 'text/plain;charset=UTF-8',
				'ephemeral-cache-age': expect.any(String),
				'ephemeral-cache-remaining-age': expect.any(String),
				'ephemeral-cache-status': 'HIT',
				'ephemeral-cache-ts': res!.headers.get('ephemeral-cache-ts')!,
				'ephemeral-cache-ttl': '0.5'
			});
		});

		it('should return null for non-existent key', async () => {
			await cache.set('existent', new Response('value'), 0.5);

			const res = cache.get('non-existent');
			expect(res).toBeNull();
		});

		it('should respect TTL', async () => {
			await cache.set('key', new Response('value'), 1);
			await util.wait(1001);

			expect(cache.get('key')).toBeNull();
			expect(cache.has('key')).toBeFalsy();
		});

		it('should respect custom TTL', async () => {
			await cache.set('key', new Response('value'), 5);
			await util.wait(1001);

			expect(cache.get('key', 1)).toBeNull();
			expect(cache.has('key')).toBeFalsy();
		});

		it('should respect maximum TTL', async () => {
			await cache.set('key', new Response('value'), 20);

			const res = cache.get('key');
			expect(headers.toJson(res!.headers)).toEqual({
				'content-type': 'text/plain;charset=UTF-8',
				'ephemeral-cache-age': '0',
				'ephemeral-cache-remaining-age': '15',
				'ephemeral-cache-status': 'HIT',
				'ephemeral-cache-ts': res!.headers.get('ephemeral-cache-ts')!,
				'ephemeral-cache-ttl': '15'
			});
		});

		it('should reset TTL on set', async () => {
			const res1 = new Response('value1');
			const res2 = new Response('value2');

			await cache.set('key', res1, 1);
			await util.wait(500);

			await cache.set('key', res2, 1); // this should reset the TTL
			await util.wait(800);

			const res = cache.get('key');
			expect(await res!.text()).toEqual('value2');
		});

		it('should trim keys', async () => {
			const res = new Response('value');
			await cache.set(' key ', res, 0.5);

			expect(cache.has('key')).toBeTruthy();
			expect(cache.get(' key ')).toBeInstanceOf(Response);
		});

		it('should return null on get with no key', () => {
			const res = cache.get('  ');

			expect(res).toBeNull();
		});

		it('should throw on set with no key', async () => {
			try {
				const res = new Response('value');
				await cache.set('  ', res);

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('Invalid key');
			}
		});
	});

	describe('has', () => {
		it('should check if key exists', async () => {
			await cache.set('key', new Response('cached value'), 0.5);

			expect(cache.has('key')).toBeTruthy();
			expect(cache.has('non-existent')).toBeFalsy();
		});
	});

	describe('size', () => {
		it('should return correct size', async () => {
			expect(cache.size()).toEqual(0);

			await cache.set('key1', new Response('cached value1'), 0.5);
			await cache.set('key2', new Response('cached value2'), 0.5);

			expect(cache.size()).toEqual(2);

			cache.delete('key1');

			expect(cache.size()).toEqual(1);
		});
	});

	describe('refreshTtl', () => {
		it('should refreshTtl', async () => {
			await cache.set('key', new Response('cached value'), 1);

			// @ts-expect-error
			const { ts } = cache.cache.get('key');
			await util.wait(500);
			cache.refreshTtl('key');

			// @ts-expect-error
			const { ts: ts2 } = cache.cache.get('key');

			expect(ts2).toBeGreaterThan(ts);
		});
	});

	describe('wrap', () => {
		let getResponse: Mock<() => Promise<Response>>;

		beforeEach(() => {
			vi.spyOn(cache, 'get');
			vi.spyOn(cache, 'set');

			getResponse = vi.fn(async () => {
				return new Response('got value');
			});
		});

		it('should return cached response if available', async () => {
			await cache.set('key', new Response('cached value'), 0.5);

			const res = await cache.wrap('key', getResponse, { ttlSeconds: 0.5 });

			expect(getResponse).not.toHaveBeenCalled();
			expect(await res.text()).toEqual('cached value');
		});

		it('should no call get/set if no key', async () => {
			const res1 = await cache.wrap('   ', getResponse, { ttlSeconds: 0.5 });
			const res2 = await cache.wrap('', getResponse, { ttlSeconds: 0.5 });

			expect(cache.get).not.toHaveBeenCalled();
			expect(cache.set).not.toHaveBeenCalled();
			expect(getResponse).toHaveBeenCalledTimes(2);
			expect(await res1.text()).toEqual('got value');
			expect(await res2.text()).toEqual('got value');
		});

		it('should no call set if null body', async () => {
			const getResponse = vi.fn(
				async () =>
					new Response(null, {
						headers: { 'content-type': 'text/plain' }
					})
			);
			const res = await cache.wrap('key', getResponse, { ttlSeconds: 0.5 });

			expect(cache.set).not.toHaveBeenCalled();
			expect(getResponse).toHaveBeenCalledOnce();
			expect(await res.text()).toEqual('');
		});

		it('should no call get/set if ttl <= 0', async () => {
			await cache.set('key', new Response('cached value'));
			vi.mocked(cache.set).mockClear();

			const res = await cache.wrap('key', getResponse, { ttlSeconds: -10 });

			expect(cache.get).not.toHaveBeenCalled();
			expect(cache.set).not.toHaveBeenCalled();
			expect(getResponse).toHaveBeenCalledTimes(1);
			expect(await res.text()).toEqual('got value');
		});

		it('should set and return if no cached', async () => {
			const res = await cache.wrap('key', getResponse, { ttlSeconds: 0.5 });
			expect(getResponse).toHaveBeenCalledOnce();
			expect(await res.text()).toEqual('got value');

			const cachedRes = cache.get('key');
			expect(await cachedRes?.text()).toEqual('got value');
		});

		it('should not set if no cacheable content-type', async () => {
			const getResponse = vi.fn(async () => {
				return new Response('value', {
					headers: {
						'content-type': 'text/event-stream'
					}
				});
			});

			await cache.wrap('key', getResponse, { ttlSeconds: 0.5 });
			expect(cache.size()).toEqual(0);
		});

		it('should trim keys', async () => {
			await cache.wrap(' key ', getResponse, { ttlSeconds: 0.5 });
			expect(getResponse).toHaveBeenCalledOnce();
			expect(cache.has('key')).toBeTruthy();

			const cachedRes = cache.get(' key ');
			expect(await cachedRes?.text()).toEqual('got value');
		});

		it('should not wrap with empty keys', async () => {
			const res1 = await cache.wrap('', getResponse, { ttlSeconds: 0.5 });
			const res2 = await cache.wrap('  ', getResponse, { ttlSeconds: 0.5 });

			expect(getResponse).toHaveBeenCalledTimes(2);
			expect(await res1.text()).toEqual('got value');
			expect(await res2.text()).toEqual('got value');
			expect(cache.size()).toEqual(0);
		});

		it('should respect expires', async () => {
			const res = await cache.wrap('key', getResponse, { ttlSeconds: 1 });
			expect(getResponse).toHaveBeenCalledOnce();
			expect(await res.text()).toEqual('got value');

			await util.wait(500);

			const getResponse2 = vi.fn(async () => {
				return new Response('got value 2');
			});
			const res2 = await cache.wrap('key', getResponse2, { ttlSeconds: 1 });
			expect(getResponse2).not.toHaveBeenCalled();
			expect(await res2.text()).toEqual('got value');

			await util.wait(501);

			const getResponse3 = vi.fn(async () => {
				return new Response('got value 3');
			});
			const res3 = await cache.wrap('key', getResponse3, { ttlSeconds: 1 });
			expect(getResponse3).toHaveBeenCalledOnce();
			expect(await res3.text()).toEqual('got value 3');
		});

		it('should reset expires', async () => {
			const res = await cache.wrap('key', getResponse, { ttlSeconds: 1 });
			expect(getResponse).toHaveBeenCalledOnce();
			expect(await res.text()).toEqual('got value');

			await util.wait(500);

			const getResponse2 = vi.fn(async () => {
				return new Response('got value 2');
			});
			const res2 = await cache.wrap('key', getResponse2, { refreshTtl: true, ttlSeconds: 1 });
			expect(getResponse2).not.toHaveBeenCalled();
			expect(await res2.text()).toEqual('got value');

			await util.wait(501);

			const getResponse3 = vi.fn(async () => {
				return new Response('got value 3');
			});
			const res3 = await cache.wrap('key', getResponse3, { ttlSeconds: 1 });
			expect(getResponse3).not.toHaveBeenCalled();
			expect(await res3.text()).toEqual('got value');
		});

		it('should set correct headers on cached responses', async () => {
			const now = Date.now();
			vi.setSystemTime(now);

			await cache.set('key', new Response('test'), 1);

			const getCachedResponse = cache.get('key');
			expect(getCachedResponse?.headers.get('ephemeral-cache-ts')).toEqual(`${now}`);
			expect(getCachedResponse?.headers.get('ephemeral-cache-ttl')).toEqual('1');
			expect(getCachedResponse?.headers.get('ephemeral-cache-remaining-age')).toEqual('1');
			expect(getCachedResponse?.headers.get('ephemeral-cache-status')).toEqual('HIT');

			const wrappedResponse = await cache.wrap(
				'key',
				async () => {
					return new Response('new test');
				},
				{ ttlSeconds: 1 }
			);
			expect(wrappedResponse.headers.get('ephemeral-cache-status')).toEqual('HIT');
		});

		it('should throws', async () => {
			try {
				await cache.wrap(
					'key',
					async () => {
						throw new Error('test error');
					},
					{ ttlSeconds: 0.5 }
				);

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('test error');
			}
		});

		describe('pending promises', () => {
			it('should store and retrieve a pending response', async () => {
				const slowResponse = vi.fn(async () => {
					await util.wait(100);
					return new Response('slow value');
				});

				const promise1 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });
				const promise2 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });
				const promise3 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });

				const res1 = await promise1;
				expect(await res1.text()).toEqual('slow value');

				const res2 = await promise2;
				expect(await res2.text()).toEqual('slow value');

				const res3 = await promise3;
				expect(await res3.text()).toEqual('slow value');

				expect(slowResponse).toHaveBeenCalledTimes(1);
				expect(res1).not.toBe(res2);
				expect(res2).not.toBe(res3);
			});

			it('should store and retrieve a pending stream response', async () => {
				const slowResponse = vi.fn(async () => {
					await util.wait(100);

					const stream = util.stringToStream('slow value');

					return new Response(stream, {
						headers: {
							'content-type': 'text/event-stream'
						}
					});
				});

				const promise1 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });
				const promise2 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });
				const promise3 = cache.wrap('key', slowResponse, { ttlSeconds: 1 });

				const res1 = await promise1;
				expect(await util.readStream(res1.body)).toEqual('slow value');

				const res2 = await promise2;
				expect(await util.readStream(res2.body)).toEqual('slow value');

				const res3 = await promise3;
				expect(await util.readStream(res3.body)).toEqual('slow value');

				expect(slowResponse).toHaveBeenCalledTimes(1);
				expect(res1).not.toBe(res2);
				expect(res2).not.toBe(res3);
			});

			it('should handle multiple concurrent requests', async () => {
				let callCount = 0;

				const slowResponse = vi.fn(async () => {
					callCount++;
					await util.wait(100);
					return new Response(`value ${callCount}`);
				});

				const promises = _.times(6, i => {
					return cache.wrap(`key-${i % 2}`, slowResponse, { ttlSeconds: 1 });
				});
				const res = await Promise.all(promises);

				expect(slowResponse).toHaveBeenCalledTimes(2);
				for (const r of res) {
					expect(await r.text()).toEqual('value 2');
				}
			});

			it('should clean up pending cache after resolution', async () => {
				const slowResponse = vi.fn(async () => {
					await util.wait(100);
					return new Response('slow value');
				});

				const promise = cache.wrap('key', slowResponse, { ttlSeconds: 1 });

				// @ts-expect-error - Accessing private property for testing
				expect(cache.pendingPromises.has('key')).toBeTruthy();

				await promise;

				// @ts-expect-error - Accessing private property for testing
				expect(cache.pendingPromises.has('key')).toBeFalsy();
				expect(cache.has('key')).toBeTruthy();
			});

			it('should handle errors in pending responses', async () => {
				const errorResponse = vi.fn(async () => {
					throw new Error('Test error');
				});

				const promise1 = cache.wrap('key', errorResponse, { ttlSeconds: 1 });
				const promise2 = cache.wrap('key', errorResponse, { ttlSeconds: 1 });

				await expect(promise1).rejects.toThrow('Test error');
				await expect(promise2).rejects.toThrow('Test error');

				expect(errorResponse).toHaveBeenCalledTimes(1);
				// @ts-expect-error - Accessing private property for testing
				expect(cache.pendingPromises.has('key')).toBeFalsy();
				expect(cache.has('key')).toBeFalsy();
			});
		});
	});
});
