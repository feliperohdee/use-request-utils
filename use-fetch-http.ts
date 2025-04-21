import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import fetch, { Fetch } from './fetch';

type UseFetchHttpFn<T> = (fetch: Fetch.Http, ...args: any[]) => Promise<T> | null;

const fetchHttp = fetch.http;
const useFetchHttp = () => {
	const fetch = <T, Mapped = T>(fn: UseFetchHttpFn<T>, options: UseFetchOptions<T, Mapped> = {}): UseFetchResponse<Mapped> => {
		const createFetchHook = fetchHookFactory<Fetch.Http>(() => {
			return fetchHttp;
		});

		return createFetchHook(fn, options);
	};

	const fetchLazy = <T, Mapped = T>(
		fn: UseFetchHttpFn<T>,
		options?: {
			ignoreAbort?: boolean;
			mapper?: (data: T) => Mapped;
		}
	): UseFetchResponse<Mapped> => {
		return fetch(fn, {
			ignoreAbort: options?.ignoreAbort || false,
			mapper: options?.mapper,
			shouldFetch: ({ initial }) => {
				return !initial;
			},
			triggerDeps: []
		});
	};

	return { fetch, fetchLazy };
};

export default useFetchHttp;
