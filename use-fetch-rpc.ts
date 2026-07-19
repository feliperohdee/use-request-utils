import fetchHookFactory, { UseFetchOptions, UseFetchReturn } from './use-fetch-hook-factory';

import type Rpc from './rpc';
import useRpc, { UseRpc } from './use-rpc';

type UseFetchRpcFn<Client extends Rpc, Data, FetchFnArgs extends any[] = any[]> = (
	rpc: UseRpc<Client>,
	...args: FetchFnArgs
) => Data | Promise<Data> | null;

const useFetchRpc = <Client extends Rpc>(requestOptions?: { headers?: Headers; pathname?: string }) => {
	const rpc = useRpc<Client>(requestOptions);
	const fetchHook = fetchHookFactory(() => {
		return rpc;
	});

	const fetchRpc = <
		Data,
		MappedData = Data,
		FetchFnArgs extends any[] = any[],
		const Options extends UseFetchOptions<UseRpc<Client>, Data, MappedData> = UseFetchOptions<UseRpc<Client>, Data, MappedData>
	>(
		fetchFn: UseFetchRpcFn<Client, Data, FetchFnArgs>,
		options: Options = {} as Options
	): UseFetchReturn<Options, MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>> => {
		return fetchHook<Data, MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>, Options>(fetchFn, options);
	};

	const lazyFetchRpc = <
		Data,
		MappedData = Data,
		FetchFnArgs extends any[] = any[],
		const Options extends Pick<UseFetchOptions<UseRpc<Client>, Data, MappedData>, 'effect' | 'ignoreAbort' | 'mapper' | 'tuple'> = Pick<
			UseFetchOptions<UseRpc<Client>, Data, MappedData>,
			'effect' | 'ignoreAbort' | 'mapper' | 'tuple'
		>
	>(
		fn: UseFetchRpcFn<Client, Data, FetchFnArgs>,
		options?: Options
	): UseFetchReturn<Options, MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>> => {
		const response: UseFetchReturn<Options, MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>> = fetchRpc<Data, MappedData, FetchFnArgs>(
			fn,
			{
				effect: options?.effect,
				ignoreAbort: options?.ignoreAbort || false,
				mapper: options?.mapper,
				shouldFetch: ({ initial }) => {
					return !initial;
				},
				triggerDeps: [],
				tuple: options?.tuple
			}
		) as UseFetchReturn<Options, MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>>;

		return response;
	};

	return { fetchRpc, lazyFetchRpc };
};

export default useFetchRpc;
