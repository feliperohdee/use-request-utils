import fetchHookFactory, { UseFetchOptions, UseFetchReturn } from './use-fetch-hook-factory';

import fetch, { Fetch } from './fetch';

type UseFetchHttpFn<Data, FetchFnArgs extends any[] = any[]> = (fetch: Fetch.Http, ...args: FetchFnArgs) => Data | Promise<Data> | null;

const useFetchHttp = () => {
	const fetchHook = fetchHookFactory(() => {
		return fetch.http;
	});

	const fetchHttp = <
		Data,
		MappedData = Data,
		FetchFnArgs extends any[] = any[],
		const Options extends UseFetchOptions<Fetch.Http, Data, MappedData> = UseFetchOptions<Fetch.Http, Data, MappedData>
	>(
		fn: UseFetchHttpFn<Data, FetchFnArgs>,
		options: Options = {} as Options
	): UseFetchReturn<Options, MappedData, UseFetchHttpFn<Data, FetchFnArgs>> => {
		return fetchHook<Data, MappedData, UseFetchHttpFn<Data, FetchFnArgs>, Options>(fn, options);
	};

	const lazyFetchHttp = <
		Data,
		MappedData = Data,
		FetchFnArgs extends any[] = any[],
		const Options extends Pick<UseFetchOptions<Fetch.Http, Data, MappedData>, 'effect' | 'ignoreAbort' | 'mapper' | 'tuple'> = Pick<
			UseFetchOptions<Fetch.Http, Data, MappedData>,
			'effect' | 'ignoreAbort' | 'mapper' | 'tuple'
		>
	>(
		fn: UseFetchHttpFn<Data, FetchFnArgs>,
		options?: Options
	): UseFetchReturn<Options, MappedData, UseFetchHttpFn<Data, FetchFnArgs>> => {
		const response: UseFetchReturn<Options, MappedData, UseFetchHttpFn<Data, FetchFnArgs>> = fetchHttp<Data, MappedData, FetchFnArgs>(fn, {
			effect: options?.effect,
			ignoreAbort: options?.ignoreAbort || false,
			mapper: options?.mapper,
			shouldFetch: ({ initial }) => {
				return !initial;
			},
			triggerDeps: [],
			tuple: options?.tuple
		}) as UseFetchReturn<Options, MappedData, UseFetchHttpFn<Data, FetchFnArgs>>;

		return response;
	};

	return { fetchHttp, lazyFetchHttp };
};

export default useFetchHttp;
