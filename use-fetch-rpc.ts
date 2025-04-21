import fetchHookFactory, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import type Rpc from './rpc';
import useRpc, { UseRpc } from './use-rpc';

type UseFetchRpcFn<R extends Rpc, T> = (rpc: UseRpc<R>, ...args: any[]) => Promise<T> | null;

const useFetchRpc = <R extends Rpc>(requestOptions?: { headers?: Headers; pathname?: string }) => {
	const fetch = <T, Mapped = T>(fn: UseFetchRpcFn<R, T>, options: UseFetchOptions<T, Mapped> = {}): UseFetchResponse<Mapped> => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const rpc = useRpc<R>(requestOptions);
		const createFetchHook = fetchHookFactory(() => {
			return rpc;
		});

		return createFetchHook(fn, options);
	};

	const fetchLazy = <T, Mapped = T>(
		fn: UseFetchRpcFn<R, T>,
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

export default useFetchRpc;
