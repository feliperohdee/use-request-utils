import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import fetch, { Fetch } from './fetch';

type UseFetchHttpFn<T> = (fetch: Fetch.Http, ...args: any[]) => Promise<T> | null;

const useFetchHttp = () => {
	const useFetchHook = fetchHookFactory(() => {
		return fetch.http;
	});

	const fetchHttp = <T, Mapped = T>(fn: UseFetchHttpFn<T>, options: UseFetchOptions<T, Mapped> = {}): UseFetchResponse<Mapped> => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		return useFetchHook(fn, options);
	};

	const lazyFetchHttp = <T, Mapped = T>(
		fn: UseFetchHttpFn<T>,
		options?: {
			ignoreAbort?: boolean;
			mapper?: (data: T) => Mapped;
		}
	): UseFetchResponse<Mapped> => {
		return fetchHttp(fn, {
			ignoreAbort: options?.ignoreAbort || false,
			mapper: options?.mapper,
			shouldFetch: ({ initial }) => {
				return !initial;
			},
			triggerDeps: []
		});
	};

	return { fetchHttp, lazyFetchHttp };
};

export default useFetchHttp;
