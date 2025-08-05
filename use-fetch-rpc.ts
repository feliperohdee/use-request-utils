import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import type Rpc from './rpc';
import useRpc, { UseRpc } from './use-rpc';

type UseFetchRpcFn<Client extends Rpc, Data, FetchFnArgs extends any[] = any[]> = (
	rpc: UseRpc<Client>,
	...args: FetchFnArgs
) => Data | Promise<Data> | null | undefined;

const useFetchRpc = <Client extends Rpc>(requestOptions?: { headers?: Headers; pathname?: string }) => {
	const rpc = useRpc<Client>(requestOptions);
	const fetchHook = fetchHookFactory(() => {
		return rpc;
	});

	const fetchRpc = <Data, MappedData = Data, FetchFnArgs extends any[] = any[]>(
		fetchFn: UseFetchRpcFn<Client, Data, FetchFnArgs>,
		options: UseFetchOptions<UseRpc<Client>, Data, MappedData> = {}
	): UseFetchResponse<MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>> => {
		return fetchHook(fetchFn, options);
	};

	const lazyFetchRpc = <Data, MappedData = Data, FetchFnArgs extends any[] = any[]>(
		fn: UseFetchRpcFn<Client, Data, FetchFnArgs>,
		options?: Pick<UseFetchOptions<UseRpc<Client>, Data, MappedData>, 'effect' | 'ignoreAbort' | 'mapper'>
	): UseFetchResponse<MappedData, UseFetchRpcFn<Client, Data, FetchFnArgs>> => {
		return fetchRpc(fn, {
			effect: options?.effect,
			ignoreAbort: options?.ignoreAbort || false,
			mapper: options?.mapper,
			shouldFetch: ({ initial }) => {
				return !initial;
			},
			triggerDeps: []
		});
	};

	return { fetchRpc, lazyFetchRpc };
};

export default useFetchRpc;
