import createFetchHook, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import type Rpc from './rpc';
import useRpc, { UseRpc } from './use-rpc';

type UseFetchRpcFn<R extends Rpc, T> = (rpc: UseRpc<R>, ...args: any[]) => Promise<T> | null;

const useFetchRpc = <R extends Rpc, T, Mapped = T>(
	fn: UseFetchRpcFn<R, T>,
	options: UseFetchOptions<T, Mapped> = {},
	requestOptions?: {
		headers?: Headers;
		pathname?: string;
	}
): UseFetchResponse<Mapped> => {
	const rpc = useRpc<R>(requestOptions);
	const useFetchHook = createFetchHook<UseRpc<R>>(() => {
		return rpc;
	});

	return useFetchHook(fn, options);
};

const useLazyFetchRpc = <R extends Rpc, T, Mapped = T>(
	fn: UseFetchRpcFn<R, T>,
	options?: {
		ignoreAbort?: boolean;
		mapper?: (data: T) => Mapped;
	},
	requestOptions?: {
		headers?: Headers;
		pathname?: string;
	}
): UseFetchResponse<Mapped> => {
	return useFetchRpc(
		fn,
		{
			ignoreAbort: options?.ignoreAbort || false,
			mapper: options?.mapper,
			shouldFetch: ({ initial }) => {
				return !initial;
			},
			triggerDeps: []
		},
		requestOptions
	);
};

export { useFetchRpc, useLazyFetchRpc };
