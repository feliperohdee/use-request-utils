import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import type Rpc from './rpc';
import useRpc, { UseRpc } from './use-rpc';

type UseFetchRpcFn<R extends Rpc, T> = (rpc: UseRpc<R>, ...args: any[]) => Promise<T> | null;

const useFetchRpc = <R extends Rpc>(requestOptions?: { headers?: Headers; pathname?: string }) => {
	const rpc = useRpc<R>(requestOptions);
	const fetchRpc = <T, Mapped = T>(fn: UseFetchRpcFn<R, T>, options: UseFetchOptions<T, Mapped> = {}): UseFetchResponse<Mapped> => {
		const useFetchHook = fetchHookFactory(() => {
			return rpc;
		});

		// eslint-disable-next-line react-hooks/rules-of-hooks
		return useFetchHook(fn, options);
	};

	const lazyFetchRpc = <T, Mapped = T>(
		fn: UseFetchRpcFn<R, T>,
		options?: {
			deps?: any[];
			ignoreAbort?: boolean;
			mapper?: (data: T) => Mapped;
		}
	): UseFetchResponse<Mapped> => {
		return fetchRpc(fn, {
			deps: options?.deps,
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
