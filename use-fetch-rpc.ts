import { useMemo } from 'react';
import createFetchHook, { UseFetchOptions, UseFetchResponse } from './use-fetch-hook-factory';

import ephemeralCache from './ephemeral-cache';
import headers from './headers';
import HttpError from 'use-http-error';
import rpcProxy, { RpcProxyRequestOptions } from './rpc-proxy';
import type Rpc from './rpc';
import util from './util';

const proxyClientToWorker = (
	rpc: Rpc.Request,
	options: RpcProxyRequestOptions,
	requestOptions?: {
		headers?: Headers;
		pathname?: string;
	}
) => {
	const uniqueKey = util.stringHash(options.body ? '' : JSON.stringify(rpc));
	const controller = new AbortController();
	const promise = (async () => {
		try {
			const req = rpcProxy.createRequest(rpc, {
				...options,
				cf: {},
				headers: headers.merge(requestOptions?.headers, options.headers),
				origin: location.origin,
				pathname: requestOptions?.pathname || '',
				signal: controller.signal
			});

			const call = async () => {
				const res = await fetch(req);

				if (!res.ok) {
					await rpcProxy.throwError(res);
				}

				return res;
			};

			const res = options.body
				? await call()
				: await ephemeralCache.wrap(uniqueKey, call, {
						refreshTtl: true,
						ttlSeconds: options.ephemeralCacheTtlSeconds ?? 1
					});

			return rpcProxy.createResponse(res);
		} catch (err) {
			throw HttpError.wrap(err as Error);
		}
	})();

	Object.assign(promise, {
		abort: () => {
			controller.abort(new HttpError(499, 'Graceful Abort'));
		},
		'unique-key': uniqueKey
	});

	return promise;
};

type UseFetchRpcFn<R extends Rpc, T> = (rpc: R, ...args: any[]) => Promise<T> | null;

const useFetchRpc = <R extends Rpc, T, Mapped = T>(
	fn: UseFetchRpcFn<R, T>,
	options: UseFetchOptions<T, Mapped> = {},
	requestOptions?: {
		headers?: Headers;
		pathname?: string;
	}
): UseFetchResponse<Mapped> => {
	const rpc = useMemo(() => {
		return rpcProxy.create<R, true>((rpc, options) => {
			return proxyClientToWorker(rpc, options, requestOptions);
		});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const useFetchHook = createFetchHook<R, UseFetchRpcFn<R, T>>(() => {
		return rpc as R;
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

export { proxyClientToWorker, useFetchRpc, useLazyFetchRpc };
