import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import HttpError from 'use-http-error';

import ephemeralCache from './ephemeral-cache';
import fetch, { HttpOptions } from './fetch';
import Request from './request';
import util from './util';

describe('/fetch', () => {
	beforeAll(() => {
		HttpError.setIncludeStack(false);
	});

	afterAll(() => {
		HttpError.setIncludeStack(true);
	});

	describe('http', () => {
		beforeEach(() => {
			ephemeralCache.clear();

			vi.spyOn(AbortController.prototype, 'abort');
			vi.spyOn(ephemeralCache, 'wrap');
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should works', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({ a: 1 }));

			const res = await fetch.http<{ a: number }>('https://api/rest');

			expect(ephemeralCache.wrap).toHaveBeenCalledWith('https://api/rest', expect.any(Function), {
				refreshTtl: true,
				ttlSeconds: 1
			});
			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(res).toEqual({ a: 1 });
		});

		it('should works with ttl = 500', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({ a: 1 }));

			await fetch.http<{ a: number }>('https://api/rest', {
				ephemeralCacheTtlSeconds: 0.5
			});

			expect(ephemeralCache.wrap).toHaveBeenCalledWith('https://api/rest', expect.any(Function), {
				refreshTtl: true,
				ttlSeconds: 0.5
			});
		});

		it('should not cache if not GET/HEAD', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({ a: 1 }));

			await fetch.http<{ a: number }>(
				new Request('https://api/rest', {
					method: 'POST'
				})
			);

			expect(ephemeralCache.wrap).not.toHaveBeenCalled();
		});

		it('should cache subsequent requests', async () => {
			vi.spyOn(global, 'fetch')
				.mockResolvedValueOnce(Response.json({ a: 1 }))
				.mockResolvedValueOnce(Response.json({ a: 1 }));

			const res1 = await fetch.http<{ a: number }>('https://api/rest');
			await util.wait(500);
			const res2 = await fetch.http<{ a: number }>('https://api/rest');
			await util.wait(1001);
			const res3 = await fetch.http<{ a: number }>('https://api/rest');

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(res1).toEqual({ a: 1 });
			expect(res2).toEqual({ a: 1 });
			expect(res3).toEqual({ a: 1 });
		});

		it('should works with string', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('string'));

			const res = await fetch.http<string>('https://api/rest');

			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(res).toEqual('string');
		});

		it('should works asObject()', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({ a: 1 }));

			const res = await fetch.http.asObject<{ a: number }>('https://api/rest');

			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(res).toEqual({
				body: { a: 1 },
				headers: new Headers({ 'content-type': 'application/json' }),
				status: 200
			});
		});

		it('should works asResponse()', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({ a: 1 }));

			const res = await fetch.http.asResponse('https://api/rest');

			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(res).toBeInstanceOf(Response);
		});

		it('should works with error asObject()', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(HttpError.response(404));

			const res = await fetch.http.asObject('https://api/rest');

			expect(res).toEqual({
				body: {
					context: {},
					message: 'Not Found',
					stack: [],
					status: 404
				},
				headers: new Headers({
					'content-type': 'application/json'
				}),
				status: 404
			});
		});

		it('should works with error asResponse()', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(HttpError.response(404));

			const res = await fetch.http.asResponse('https://api/rest');

			expect(res).toBeInstanceOf(Response);
			expect(res.status).toEqual(404);
		});

		it('should works with request and options', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(null, {
					status: 200
				})
			);

			await fetch.http(
				new Request('https://api/rest', {
					headers: new Headers({
						'edge-api-key': 'edge-api-key',
						'edge-api-key-1': 'edge-api-key-1'
					})
				}),
				{
					ephemeralCacheTtlSeconds: 0,
					init: {
						headers: {
							'edge-api-key': 'edge-api-key-1'
						}
					}
				}
			);

			const req = vi.mocked(global.fetch).mock.calls[0][0] as Request;

			expect(global.fetch).toHaveBeenCalledWith(expect.any(Request));
			expect(req.headers.get('edge-api-key')).toEqual('edge-api-key-1');
		});

		it('should throw on HttpError', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(HttpError.response(404));

			try {
				await fetch.http('https://api');

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Not Found',
					stack: [],
					status: 404
				});
			}
		});

		it('should throw on generic error', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(null, {
					status: 404
				})
			);

			try {
				await fetch.http('https://api');

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Not Found',
					stack: [],
					status: 404
				});
			}
		});

		it('should throw on unhandled error', async () => {
			vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
				throw new Error('Error');
			});

			try {
				await fetch.http('https://api');

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Error',
					stack: [],
					status: 500
				});
			}
		});

		it('should throw on generic error with text', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response('Error', {
					status: 404
				})
			);

			try {
				await fetch.http('https://api');

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Error',
					stack: [],
					status: 404
				});
			}
		});

		it('should be abortable', async () => {
			const promise = fetch.http('https://api');
			promise.abort();

			await expect(promise).rejects.toThrow('Graceful Abort');
			expect(AbortController.prototype.abort).toHaveBeenCalled();
		});
	});

	describe('HttpOptions', () => {
		it('should works', () => {
			expect(new HttpOptions({})).toEqual({
				ephemeralCacheTtlSeconds: 1,
				init: null
			});
		});

		it('should works with options', () => {
			const controller = new AbortController();
			const headers = new Headers({
				'edge-a': 'a'
			});

			expect(
				new HttpOptions({
					init: {
						headers,
						signal: controller.signal
					},
					ephemeralCacheTtlSeconds: 0
				})
			).toEqual({
				init: {
					headers,
					signal: controller.signal
				},
				ephemeralCacheTtlSeconds: 0
			});
		});
	});
});
