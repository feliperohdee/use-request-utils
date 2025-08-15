import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import fetch, { Fetch } from './fetch';

type UseFetchHttpFn<Data, FetchFnArgs extends any[] = any[]> = (fetch: Fetch.Http, ...args: FetchFnArgs) => Data | Promise<Data> | null;

const useFetchHttp = () => {
	const fetchHook = fetchHookFactory(() => {
		return fetch.http;
	});

	const fetchHttp = <Data, MappedData = Data, FetchFnArgs extends any[] = any[]>(
		fn: UseFetchHttpFn<Data, FetchFnArgs>,
		options: UseFetchOptions<Fetch.Http, Data, MappedData> = {}
	): UseFetchResponse<MappedData, UseFetchHttpFn<Data, FetchFnArgs>> => {
		return fetchHook(fn, options);
	};

	const lazyFetchHttp = <Data, MappedData = Data, FetchFnArgs extends any[] = any[]>(
		fn: UseFetchHttpFn<Data, FetchFnArgs>,
		options?: Pick<UseFetchOptions<Fetch.Http, Data, MappedData>, 'effect' | 'ignoreAbort' | 'mapper'>
	): UseFetchResponse<MappedData, UseFetchHttpFn<Data, FetchFnArgs>> => {
		return fetchHttp(fn, {
			effect: options?.effect,
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
