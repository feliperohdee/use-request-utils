import { useCallback, useEffect, useMemo } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HttpError from 'use-http-error';

import { Fetch } from './fetch';
import useFetchHttp from './use-fetch-http';
import util from './util';

const createAbortableMock = (uniqueKey: string = '', timeoutMs: number = 0) => {
	const abort = vi.fn();
	const fn = vi.fn((fetch: Fetch.Http, ...args: any[]) => {
		const [a = 1] = args || [];

		const abortController = new AbortController();
		const promise = new Promise<{ a: number }>((resolve, reject) => {
			const timeout = setTimeout(() => {
				resolve({ a });
			}, timeoutMs);

			abortController.signal.addEventListener('abort', () => {
				clearTimeout(timeout);
				reject(new DOMException('', 'AbortError'));
			});
		});

		Object.assign(promise, {
			abort: () => {
				abort();
				abortController.abort();
			},
			'unique-key': uniqueKey
		});

		return promise;
	});

	return { abort, fn };
};

const fetcher = (fetch: Fetch.Http, ...args: any[]) => {
	return fetch<{ a: number; args: any[] }>(
		new Request('http://localhost', {
			body: JSON.stringify({ args }),
			method: 'POST'
		})
	);
};

describe('/use-fetch-http', () => {
	beforeEach(() => {
		let i = 0;

		vi.spyOn(global, 'fetch').mockImplementation(async input => {
			if (input instanceof Request) {
				const json = await input.json();

				return Response.json({
					a: ++i,
					args: json.args
				});
			}

			return Response.json(null);
		});
	});

	it('should throw if options.mapper is not a function', () => {
		try {
			renderHook(() => {
				const { fetchHttp } = useFetchHttp();

				// @ts-expect-error
				fetchHttp(() => null, { mapper: 'not-a-function' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('failed to start due to invalid options: The "mapper" property must be a function');
		}
	});

	it('should throw if options.triggerDeps is not an array', () => {
		try {
			renderHook(() => {
				const { fetchHttp } = useFetchHttp();

				// @ts-expect-error
				fetchHttp(() => null, { triggerDeps: 'not-an-array' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('failed to start due to invalid options: The "triggerDeps" property must be an array');
		}
	});

	it('should throw if options.triggerDepsDebounce is not a number', () => {
		try {
			renderHook(() => {
				const { fetchHttp } = useFetchHttp();

				// @ts-expect-error
				fetchHttp(() => null, { triggerDepsDebounce: 'not-a-number' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('failed to start due to invalid options: The "triggerDepsDebounce" property must be a number');
		}
	});

	it('should throw if options.triggerInterval is not a number', () => {
		try {
			renderHook(() => {
				const { fetchHttp } = useFetchHttp();

				// @ts-expect-error
				fetchHttp(() => null, { triggerInterval: 'not-a-number' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'failed to start due to invalid options: The "triggerInterval" property must be a number greater than 500'
			);
		}
	});

	it('should throw if options.triggerInterval is less than 500', async () => {
		try {
			renderHook(() => {
				const { fetchHttp } = useFetchHttp();

				fetchHttp(fetcher, { triggerInterval: 499 });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'failed to start due to invalid options: The "triggerInterval" property must be a number greater than 500'
			);
		}
	});

	it('should works', async () => {
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher);
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works ensuring fetch function updates dynamically across hooks', async () => {
		const { result, rerender } = renderHook(
			({ deps }) => {
				const { fetchHttp } = useFetchHttp();
				const hook = fetchHttp(async () => {
					return deps;
				});

				const stableFetch1 = useMemo(() => {
					return hook.fetch;
				}, []); // eslint-disable-line react-hooks/exhaustive-deps

				const stableFetch2 = useCallback(() => {
					return stableFetch1();
				}, []); // eslint-disable-line react-hooks/exhaustive-deps

				useEffect(() => {
					stableFetch2();
				}, [deps]); // eslint-disable-line react-hooks/exhaustive-deps

				return hook;
			},
			{
				initialProps: {
					deps: [1, 2]
				}
			}
		);

		await waitFor(() => {
			expect(result.current.data).toEqual([1, 2]);
		});

		rerender({ deps: [3, 4] });

		await waitFor(() => {
			expect(result.current.data).toEqual([3, 4]);
		});
	});

	it('should works with options.effect', async () => {
		const effect = vi.fn();

		renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher, { effect });
		});

		expect(effect).not.toHaveBeenCalledOnce();

		await waitFor(() => {
			expect(effect).toHaveBeenCalledWith({
				client: expect.anything(),
				data: { a: 1, args: [] }
			});
		});
	});

	it('should works with async options.effect', async () => {
		const mock = vi.fn();
		const effect = vi.fn(async ({ client, data }) => {
			await util.wait(100);
			mock({ client, data });
		});

		renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher, { effect });
		});

		expect(effect).not.toHaveBeenCalledOnce();

		await waitFor(() => {
			expect(mock).toHaveBeenCalledWith({
				client: expect.anything(),
				data: { a: 1, args: [] }
			});
		});
	});

	it('should works with options.mapper', async () => {
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher, {
				mapper: ({ data }) => {
					return data ? { ...data, a1: data.a } : null;
				}
			});
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, a1: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with async options.mapper', async () => {
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher, {
				mapper: async ({ data }) => {
					await util.wait(100);
					return data ? { ...data, a1: data.a } : null;
				}
			});
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, a1: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.triggerDeps using default debounce', async () => {
		vi.useFakeTimers();

		const mock = vi.fn();
		const { result, rerender } = renderHook(
			({ triggerDeps }) => {
				const { fetchHttp } = useFetchHttp();

				return fetchHttp(
					(fetch: Fetch.Http, ...args: any[]) => {
						mock();
						return fetcher(fetch, ...args);
					},
					{ triggerDeps }
				);
			},
			{
				initialProps: { triggerDeps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		rerender({ triggerDeps: [1] });
		expect(mock).toHaveBeenCalledOnce();

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(2);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(2);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.triggerDeps using custom debounce', async () => {
		vi.useFakeTimers();

		const mock = vi.fn();
		const { result, rerender } = renderHook(
			({ triggerDeps }) => {
				const { fetchHttp } = useFetchHttp();

				return fetchHttp(
					(fetch: Fetch.Http, ...args: any[]) => {
						mock();
						return fetcher(fetch, ...args);
					},
					{ triggerDeps, triggerDepsDebounce: 100 }
				);
			},
			{
				initialProps: { triggerDeps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		rerender({ triggerDeps: [1] });
		expect(mock).toHaveBeenCalledOnce();

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledOnce();

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(100);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(2);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(2);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.shouldFetch = false', async () => {
		const mock = vi.fn();
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(
				(fetch: Fetch.Http, ...args: any[]) => {
					mock();
					return fetcher(fetch, ...args);
				},
				{
					shouldFetch: false
				}
			);
		});

		expect(mock).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(0);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeFalsy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);
	});

	it('should works with options.shouldFetch = () => false', async () => {
		const mock = vi.fn();
		const shouldFetch = vi.fn(() => false);
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(
				(fetch: Fetch.Http, ...args: any[]) => {
					mock();
					return fetcher(fetch, ...args);
				},
				{ shouldFetch }
			);
		});

		expect(mock).not.toHaveBeenCalled();
		expect(shouldFetch).toHaveBeenCalledWith({
			initial: true,
			loaded: false,
			loadedTimes: 0,
			loading: false
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(0);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeFalsy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);
	});

	it('should abort previous promises on subsequent calls with different promises', async () => {
		const mock = createAbortableMock();
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(mock.fn);
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});

		const promise2 = result.current.fetch(2);
		const promise3 = result.current.fetch(3);
		const res2 = await promise2;
		const res3 = await promise3;

		expect(res2).toBeNull();
		expect(res3).toEqual({ a: 3 });

		expect(mock.fn).toHaveBeenCalledTimes(3);
		expect(mock.abort).toHaveBeenCalledOnce();

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 3 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(3);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should not abort previous promises on subsequent calls with same promises', async () => {
		const mock = createAbortableMock('unique-key');
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(mock.fn);
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});

		const promise2 = result.current.fetch(2);
		const promise3 = result.current.fetch(3);
		const res2 = await promise2;
		const res3 = await promise3;

		expect(res2).toEqual({ a: 2 });
		expect(res3).toEqual({ a: 3 });

		expect(mock.fn).toHaveBeenCalledTimes(3);
		expect(mock.abort).not.toHaveBeenCalled();

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 3 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(3);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(3);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should keep previous state on abort', async () => {
		const mock = createAbortableMock();
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(mock.fn);
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});

		result.current.fetch(2);
		result.current.abort();

		expect(mock.abort).toHaveBeenCalledOnce();

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with reset', async () => {
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher);
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
			expect(result.current.runningInterval).toEqual(0);
		});

		result.current.reset();

		await waitFor(() => {
			expect(result.current.data).toBeNull();
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(0);
			expect(result.current.lastFetchDuration).toEqual(0);
			expect(result.current.loaded).toBeFalsy();
			expect(result.current.loadedTimes).toEqual(0);
			expect(result.current.loading).toBeFalsy();
			expect(result.current.runningInterval).toEqual(0);
		});
	});

	it('should works with error', async () => {
		vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Error'));

		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher);
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(1);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toBeNull();
			expect(result.current.error).toBeInstanceOf(HttpError);
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeFalsy();
			expect(result.current.loadedTimes).toEqual(0);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with lazyFetchHttp with additional arguments', async () => {
		const { result } = renderHook(() => {
			const { lazyFetchHttp } = useFetchHttp();

			return lazyFetchHttp((fetch: Fetch.Http, arg1: string, arg2: string) => {
				return fetcher(fetch, arg1, arg2);
			});
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetchTimes).toEqual(0);
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.lastFetchDuration).toEqual(0);
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeFalsy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await result.current.fetch('test1', 'test2');

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: ['test1', 'test2'] });
			expect(result.current.error).toBeNull();
			expect(result.current.fetchTimes).toEqual(1);
			expect(result.current.lastFetchDuration).toBeGreaterThan(0);
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with setData', async () => {
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(fetcher);
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
		});

		result.current.setData({ a: 2, args: [] });

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
		});

		result.current.setData(data => {
			data.a += 1;

			return data;
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 3, args: [] });
		});
	});

	it('should fetch data at specified interval', async () => {
		vi.useFakeTimers();

		const mock = vi.fn();
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(
				(fetch: Fetch.Http, ...args: any[]) => {
					mock();
					return fetcher(fetch, ...args);
				},
				{ triggerInterval: 600 }
			);
		});

		expect(mock).toHaveBeenCalledOnce();

		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(mock).toHaveBeenCalledTimes(2);

		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(mock).toHaveBeenCalledTimes(3);

		vi.useRealTimers();

		await waitFor(() => {
			expect(result.current.runningInterval).toEqual(600);
		});
	});

	it('should fetch data with startInterval and stopInterval', async () => {
		vi.useFakeTimers();

		const mock = vi.fn();
		const { result } = renderHook(() => {
			const { fetchHttp } = useFetchHttp();

			return fetchHttp(
				(fetch: Fetch.Http, ...args: any[]) => {
					mock();
					return fetcher(fetch, ...args);
				},
				{ triggerInterval: 600 }
			);
		});

		result.current.startInterval(600);

		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(mock).toHaveBeenCalledTimes(2);

		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(mock).toHaveBeenCalledTimes(3);

		vi.useRealTimers();

		await waitFor(() => {
			expect(result.current.runningInterval).toEqual(600);
		});

		result.current.stopInterval();

		await waitFor(() => {
			expect(result.current.runningInterval).toEqual(0);
		});
	});
});
