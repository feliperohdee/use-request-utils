import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import HttpError from 'use-http-error';
import MapStore from 'use-request-utils/map-store';

import { useFetch, useLazyFetch } from './use-fetch';

const createAbortableMock = (uniqueKey: string = '') => {
	const abort = vi.fn();
	const fn = vi.fn((ctx: any, ...args: any[]) => {
		const [a = 1] = args || [];

		const abortController = new AbortController();
		const promise = new Promise<{ a: number }>((resolve, reject) => {
			const timeout = setTimeout(() => {
				resolve({ a });
			});

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

describe('/use-fetch', () => {
	let mock: Mock<(...args: any[]) => Promise<{ a: number }>>;

	beforeEach(() => {
		let i = 0;

		mock = vi.fn(async (context: any, ...args: any[]) => {
			return { a: ++i, args };
		});
	});

	it('should throw if options.deps is not an array', async () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { deps: 'not-an-array', key: 'PERSISTED_STATE_KEY' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('app.useFetch failed to start due to invalid options: The "deps" property must be an array');
		}
	});

	it('should throw if options.depsDebounce is not a number', async () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { depsDebounce: 'not-a-number', key: 'PERSISTED_STATE_KEY' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "depsDebounce" property must be a number'
			);
		}
	});

	it('should throw if options.mapper is not a function', () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { mapper: 'not-a-function' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "mapper" property must be a function'
			);
		}
	});

	it('should throw if options.triggerDeps is not an array', () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { triggerDeps: 'not-an-array' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "triggerDeps" property must be an array'
			);
		}
	});

	it('should throw if options.triggerDepsDebounce is not a number', () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { triggerDepsDebounce: 'not-a-number' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "triggerDepsDebounce" property must be a number'
			);
		}
	});

	it('should throw if options.triggerInterval is not a number', () => {
		try {
			renderHook(() => {
				// @ts-expect-error
				useFetch(mock, { triggerInterval: 'not-a-number' });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "triggerInterval" property must be a number greater than 500'
			);
		}
	});

	it('should throw if options.triggerInterval is less than 500', async () => {
		try {
			renderHook(() => {
				useFetch(mock, { triggerInterval: 499 });
			});

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual(
				'app.useFetch failed to start due to invalid options: The "triggerInterval" property must be a number greater than 500'
			);
		}
	});

	it('should works', async () => {
		const { result } = renderHook(() => {
			return useFetch(mock);
		});

		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should change fn according to options.deps', async () => {
		vi.useFakeTimers();

		const fn1 = vi.fn(async () => {
			return { fn: 1 };
		});

		const fn2 = vi.fn(async () => {
			return { fn: 2 };
		});

		const { result, rerender } = renderHook(
			({ fn, deps }) => {
				return useFetch(fn, { deps });
			},
			{
				initialProps: {
					fn: fn1,
					deps: [0]
				}
			}
		);

		rerender({
			fn: fn2,
			deps: [0]
		});
		act(() => {
			vi.runAllTimers();
		});

		// must keep returning as fn1 once the deps is not changed
		const res1 = await result.current.fetch();
		expect(res1).toEqual({ fn: 1 });

		rerender({
			fn: fn2,
			deps: [1]
		});
		act(() => {
			vi.runAllTimers();
		});

		const res2 = await result.current.fetch();
		expect(res2).toEqual({ fn: 2 });

		vi.useRealTimers();
	});

	it('should works with options.mapper', async () => {
		const { result } = renderHook(() => {
			return useFetch(mock, {
				mapper: data => {
					return data ? { ...data, a1: data.a } : null;
				}
			});
		});

		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, a1: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.deps using default debounce', async () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ deps }) => {
				return useFetch(mock, {
					deps
				});
			},
			{
				initialProps: { deps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		rerender({ deps: [1] });
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.error).toBeNull();
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
			expect(result.current.error).toBeNull();
		});
	});

	it('should works with options.deps using custom debounce', async () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ deps }) => {
				return useFetch(mock, {
					deps,
					depsDebounce: 100
				});
			},
			{
				initialProps: { deps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		rerender({ deps: [1] });
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(100);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.deps and empty options.triggerDeps', async () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ deps }) => {
				return useFetch(mock, {
					deps,
					triggerDeps: []
				});
			},
			{
				initialProps: { deps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		rerender({ deps: [1] });
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(1);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.triggerDeps using default debounce', async () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ triggerDeps }) => {
				return useFetch(mock, {
					triggerDeps
				});
			},
			{
				initialProps: { triggerDeps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		rerender({ triggerDeps: [1] });
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.triggerDeps using custom debounce', async () => {
		vi.useFakeTimers();

		const { result, rerender } = renderHook(
			({ triggerDeps }) => {
				return useFetch(mock, {
					triggerDeps,
					triggerDepsDebounce: 100
				});
			},
			{
				initialProps: { triggerDeps: [0] }
			}
		);

		expect(mock).toHaveBeenCalledOnce();
		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		rerender({ triggerDeps: [1] });
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(50);
		});
		expect(mock).toHaveBeenCalledTimes(1);

		// wait debounce
		act(() => {
			vi.advanceTimersByTime(100);
		});
		expect(mock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 2, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with options.shouldFetch = false', async () => {
		const { result } = renderHook(() => {
			return useFetch(mock, {
				shouldFetch: false
			});
		});

		expect(mock).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.error).toBeNull();
		expect(result.current.loading).toBeFalsy();
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);
	});

	it('should works with options.shouldFetch = () => false', async () => {
		const shouldFetch = vi.fn(() => false);
		const { result } = renderHook(() => {
			return useFetch(mock, {
				shouldFetch
			});
		});

		expect(mock).not.toHaveBeenCalled();
		expect(shouldFetch).toHaveBeenCalledWith({
			initial: true,
			loaded: false,
			loadedTimes: 0,
			loading: false,
			worker: false
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeFalsy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);
	});

	it('should abort previous promises on subsequent calls with different promises', async () => {
		const mock = createAbortableMock();
		const { result } = renderHook(() => {
			return useFetch(mock.fn, {});
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
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
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(2);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should not abort previous promises on subsequent calls with same promises', async () => {
		const mock = createAbortableMock('unique-key');
		const { result } = renderHook(() => {
			return useFetch(mock.fn, {});
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
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
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(3);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should keep previous state on abort', async () => {
		const mock = createAbortableMock();
		const { result } = renderHook(() => {
			return useFetch(mock.fn, {});
		});

		expect(mock.fn).toHaveBeenCalledOnce();
		expect(mock.abort).not.toHaveBeenCalled();

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1 });
			expect(result.current.error).toBeNull();
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
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with reset', async () => {
		const { result } = renderHook(() => {
			return useFetch(mock);
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: [] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
			expect(result.current.runningInterval).toEqual(0);
		});

		result.current.reset();

		await waitFor(() => {
			expect(result.current.data).toBeNull();
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeFalsy();
			expect(result.current.loadedTimes).toEqual(0);
			expect(result.current.loading).toBeFalsy();
			expect(result.current.runningInterval).toEqual(0);
		});
	});

	it('should works with error', async () => {
		mock.mockImplementationOnce(async () => {
			throw new Error('Error');
		});

		const { result } = renderHook(() => {
			return useFetch(mock);
		});

		expect(mock).toHaveBeenCalledWith(expect.any(Function));

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeTruthy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await waitFor(() => {
			expect(result.current.data).toBeNull();
			expect(result.current.error).toBeInstanceOf(HttpError);
			expect(result.current.loaded).toBeFalsy();
			expect(result.current.loadedTimes).toEqual(0);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should works with useLazyFetch with additional arguments', async () => {
		const { result } = renderHook(() => {
			return useLazyFetch((context, arg1, arg2) => {
				return mock(context, arg1, arg2);
			});
		});

		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.fetch).toBeTypeOf('function');
		expect(result.current.loaded).toBeFalsy();
		expect(result.current.loadedTimes).toEqual(0);
		expect(result.current.loading).toBeFalsy();
		expect(result.current.reset).toBeTypeOf('function');
		expect(result.current.runningInterval).toEqual(0);

		await result.current.fetch('test1', 'test2');

		expect(mock).toHaveBeenCalledWith(expect.any(Function), 'test1', 'test2');

		await waitFor(() => {
			expect(result.current.data).toEqual({ a: 1, args: ['test1', 'test2'] });
			expect(result.current.error).toBeNull();
			expect(result.current.loaded).toBeTruthy();
			expect(result.current.loadedTimes).toEqual(1);
			expect(result.current.loading).toBeFalsy();
		});
	});

	it('should fetch data at specified interval', async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => {
			return useFetch(mock, {
				triggerInterval: 600
			});
		});

		expect(mock).toHaveBeenCalledTimes(1);

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

		const { result } = renderHook(() => {
			return useFetch(mock);
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
