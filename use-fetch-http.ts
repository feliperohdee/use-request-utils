import createFetchHook, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import fetch, { Fetch } from './fetch';
import type Rpc from './rpc';

type UseFetchHttpFn<T> = (fetch: Fetch.Http, ...args: any[]) => Promise<T> | null;

const useFetchHttp = <T, Mapped = T>(fn: UseFetchHttpFn<T>, options: UseFetchOptions<T, Mapped> = {}): UseFetchResponse<Mapped> => {
	const useFetchHook = createFetchHook<Fetch.Http, UseFetchHttpFn<T>>(() => {
		return fetch.http;
	});

	return useFetchHook(fn, options);
};

const useLazyFetchHttp = <T, Mapped = T>(
	fn: UseFetchHttpFn<T>,
	options?: {
		ignoreAbort?: boolean;
		mapper?: (data: T) => Mapped;
	}
): UseFetchResponse<Mapped> => {
	return useFetchHttp(fn, {
		ignoreAbort: options?.ignoreAbort || false,
		mapper: options?.mapper,
		shouldFetch: ({ initial }) => {
			return !initial;
		},
		triggerDeps: []
	});
};

export { useFetchHttp, useLazyFetchHttp };
