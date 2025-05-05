import flatten from 'lodash/flatten';
import initial from 'lodash/initial';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import last from 'lodash/last';
import map from 'lodash/map';
import size from 'lodash/size';
import trim from 'lodash/trim';

import HttpError from 'use-http-error';
import JSON from 'use-json';
import type { CfProperties } from '@cloudflare/workers-types';

import headers from './headers';
import Request from './request';
import RpcResponse from './rpc-response';
import type Rpc from './rpc';
import util from './util';

namespace RpcProxy {
	export namespace Payload {
		export interface Single extends Rpc.Request {
			batch: false;
		}

		export interface Batch extends Rpc.Request {
			args: Single[];
			batch: true;
		}
	}

	export namespace Resources {
		type BatchMethod<SetAbortable> = {
			<T extends readonly unknown[] | []>(
				values: T,
				options?: RpcProxyRequestOptions
			): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> & Abortable<SetAbortable>;

			asResponse<T extends readonly unknown[] | []>(
				values: T,
				options?: RpcProxyRequestOptions
			): Promise<Rpc.Response<{ -readonly [P in keyof T]: Awaited<T[P]> }>> & Abortable<SetAbortable>;

			asObject<T extends readonly unknown[] | []>(
				values: T,
				options?: RpcProxyRequestOptions
			): Promise<Rpc.ResponseObject<{ -readonly [P in keyof T]: Awaited<T[P]> }>> & Abortable<SetAbortable>;
		};

		type Base<T, Args extends any[], SetAbortable> = {
			(...args: Args): Promise<T> & Abortable<SetAbortable>;
			asObject(...args: Args): Promise<Rpc.ResponseObject<T>> & Abortable<SetAbortable>;
			asResponse(...args: Args): Promise<Rpc.Response<T>> & Abortable<SetAbortable>;
		};

		type ResourceResponse<T> = T extends Rpc.Response<infer R> ? R : T;

		export type Helpers<SetAbortable> = {
			batch: BatchMethod<SetAbortable>;
			options: (options: {
				body?: Blob | null;
				ephemeralCacheTtlSeconds?: number;
				headers?: Headers;
				signal?: AbortSignal | null;
			}) => RpcProxyRequestOptions;
		};

		export type Private =
			| 'call'
			| 'callMany'
			| 'createResponse'
			| 'fetch'
			| 'mapResource'
			| 'request'
			| 'tryCached'
			| 'validRequest'
			| `_${string}`
			| `$${string}`;

		export type Resource<T, SetAbortable> = T extends (...args: any[]) => any
			? T extends (...args: any[]) => Promise<infer R>
				? Base<ResourceResponse<R>, [...Parameters<T>, RpcProxyRequestOptions?], SetAbortable>
				: Base<ResourceResponse<ReturnType<T>>, [...Parameters<T>, RpcProxyRequestOptions?], SetAbortable>
			: never;
	}

	export namespace Test {
		export type Options = {
			cf?: CfProperties;
			headers?: Headers;
			mock?: (args: {
				cf: CfProperties;
				headers: Record<string, string>;
				options: RpcProxyRequestOptions;
				rpc: Rpc.Request;
				url: string;
			}) => void;
		};

		export type Caller<T> = RpcProxy.Proxy<T, true>;
	}

	type Abortable<A> = A extends true ? { abort: () => void } : unknown;
	type RecursiveProxy<T, SetAbortable> = T extends (...args: any[]) => any
		? Resources.Resource<T, SetAbortable>
		: T extends object
			? {
					[K in keyof T as Exclude<K, Resources.Private>]: RecursiveProxy<T[K], SetAbortable>;
				}
			: T;

	export type Handler = (rpc: Rpc.Request, options: RpcProxyRequestOptions) => any;
	export type Payload = Payload.Single | Payload.Batch;
	export type Proxy<T, SetAbortable = false> = T extends Rpc ? RecursiveProxy<T, SetAbortable> & Resources.Helpers<SetAbortable> : null;
}

const create = <T, SetAbortable = false>(
	handler: RpcProxy.Handler,
	path: string[] = [],
	parentContext?: {
		batch: boolean;
		options: RpcProxyRequestOptions;
	},
	responseType: Rpc.ResponseType = 'default'
): RpcProxy.Proxy<T, SetAbortable> => {
	const context = parentContext ?? {
		batch: false,
		options: new RpcProxyRequestOptions()
	};

	const resetContext = () => {
		context.batch = false;
		context.options = new RpcProxyRequestOptions();
	};

	const proxy = new Proxy(() => {}, {
		get(_obj, key) {
			if (!isString(key) || key === 'then') {
				return;
			}

			// avoid calling batch() if we're already in a batch
			if (context.batch && key === 'batch') {
				resetContext();
				throw new HttpError(400, 'Nested batch calls are not allowed');
			}

			if (!context.batch) {
				context.batch = key === 'batch';
			}

			if (key === 'asObject') {
				responseType = 'object';
				key = '';
			}

			if (key === 'asResponse') {
				responseType = 'response';
				key = '';
			}

			return create(handler, key ? [...path, key] : path, context, responseType);
		},
		apply(_1, _2, args) {
			const resource = path.join('.');
			const payload: RpcProxy.Payload = {
				args,
				batch: context.batch,
				resource,
				responseType
			};

			// special case for options
			if (resource === 'options') {
				const options = new RpcProxyRequestOptions(args[0]);

				if (context.batch && options.body) {
					resetContext();
					throw new HttpError(400, 'Batch requests does not support body');
				}

				return options;
			}

			const lastArg = last(args);

			if (lastArg instanceof RpcProxyRequestOptions) {
				context.options = new RpcProxyRequestOptions({
					body: lastArg.body || context.options.body,
					ephemeralCacheTtlSeconds: lastArg.ephemeralCacheTtlSeconds,
					headers: headers.merge(context.options.headers, lastArg.headers),
					signal: lastArg.signal || context.options.signal
				});

				payload.args = initial(payload.args);
			}

			if (context.batch && resource !== 'batch') {
				return payload;
			}

			try {
				if (payload.batch) {
					payload.args = flatten(payload.args).filter(obj => {
						return !isFunction(obj);
					});
				}

				return handler(payloadToRequest(payload), context.options);
			} finally {
				resetContext();
			}
		}
	});

	return proxy as RpcProxy.Proxy<T, SetAbortable>;
};

const createRequest = (
	rpc: Rpc.Request,
	options?: Partial<{
		body: Blob | null;
		cf?: CfProperties;
		ephemeralCacheTtlSeconds: number;
		headers: Headers;
		origin: string;
		pathname: string;
		signal: AbortSignal | null;
	}>
) => {
	const body: BodyInit = JSON.stringify(rpc);
	const form = new FormData();
	const requestHeaders = new Headers(options?.headers);
	const url = new URL(options?.pathname || '/api/rpc', options?.origin || 'http://localhost');

	form.append('rpc', body);
	requestHeaders.delete('content-type');

	if (rpc.batch) {
		requestHeaders.set('rpc-request-batch', 'true');

		if (options?.body) {
			throw new HttpError(400, 'Batch requests does not support body');
		}
	}

	if (options?.body) {
		form.append('body', options.body);
	}

	return new Request(url, {
		body: form,
		cf: options?.cf,
		headers: requestHeaders,
		method: 'POST',
		signal: options?.signal || null
	});
};

const createResponse = async <T>(input: Response) => {
	const responseBatch = input.headers.get('rpc-response-batch') === 'true';
	const responseType = input.headers.get('rpc-response-type');

	// handle batch responses
	if (responseBatch) {
		const res: Rpc.ResponseBatch[] = await input.json();
		// transform each response
		const body = map(res, res => {
			if (res.responseType === 'response') {
				return new RpcResponse<T>(res.body, {
					headers: new Headers(res.headers),
					status: res.status
				});
			}

			let json = res.contentType?.includes('application/json') || false;
			let body = res.body;

			if (json) {
				body = util.safeParse(body);
			}

			if (res.responseType === 'object') {
				const obj: Rpc.ResponseObject<T> = {
					body: body as T,
					headers: res.headers,
					ok: res.ok,
					status: res.status
				};

				return obj;
			}

			// when batch, error responses are not thrown to not break the whole batch, errors must be treated using asObject or asResponse
			if (!res.ok) {
				return null;
			}

			return body as T;
		});

		if (responseType === 'response') {
			return Response.json(
				await Promise.all(
					map(body, async res => {
						// cannot send Response object over inside another Response object, so we need to convert it to RpcResponse
						if (res instanceof Response) {
							let body = await util.readStream(res.body);
							let json = res.headers.get('content-type')?.includes('application/json');

							if (json) {
								body = util.safeParse(body);
							}

							const obj: Rpc.ResponseObject<T> = {
								body: body as T,
								headers: headers.toJson(res.headers),
								ok: res.ok,
								status: res.status
							};

							return obj;
						}

						return res;
					})
				),
				input
			);
		}

		if (responseType === 'object') {
			const obj: Rpc.ResponseObject<T> = {
				body: body as T,
				headers: headers.toJson(input.headers),
				ok: input.ok,
				status: input.status
			};

			return obj;
		}

		return body as T[];
	}
	// end handle batch responses

	// handle single response
	if (responseType === 'response') {
		return input;
	}

	let body = await util.readStream(input.body);
	let json = input.headers.get('content-type')?.includes('application/json');

	if (json) {
		body = util.safeParse(body);
	}

	if (responseType === 'object') {
		const obj: Rpc.ResponseObject<T> = {
			body: body as T,
			headers: headers.toJson(input.headers),
			ok: input.ok,
			status: input.status
		};

		return obj;
	}

	return body as T;
};

const createTestCaller = <T extends Rpc>(instance: T, testOptions?: RpcProxy.Test.Options) => {
	return create<T, true>(async (rpc, options) => {
		const req = createRequest(rpc, {
			body: options.body,
			cf: testOptions?.cf,
			headers: headers.merge(testOptions?.headers, options?.headers),
			signal: options.signal
		});

		// @ts-expect-error
		instance.__DANGEROUSLY_ALLOW_PRIVATE_METHODS__ = true;
		const res = await instance.fetch(rpc, req);

		if (testOptions?.mock) {
			testOptions.mock({
				cf: req.cf || {},
				headers: headers.toJson(req.headers),
				options,
				rpc,
				url: req.url
			});
		}

		if (!res.ok) {
			await throwError(res);
		}

		return createResponse(res);
	}) as RpcProxy.Test.Caller<T>;
};

const payloadToRequest = (payload: RpcProxy.Payload): Rpc.Request => {
	if (!payload.batch) {
		return {
			args: payload.args,
			batch: payload.batch,
			resource: payload.resource,
			responseType: payload.responseType
		};
	}

	return {
		...payload,
		args: map(payload.args, payload => {
			if (!isPlainObject(payload) || !isArray(payload.args) || !isString(payload.resource)) {
				return {
					args: [],
					batch: false,
					resource: '',
					responseType: 'default'
				};
			}

			const resource = trim(payload.resource);

			if (!size(resource)) {
				return {
					args: [],
					batch: false,
					resource: '',
					responseType: 'default'
				};
			}

			return {
				args: payload.args,
				batch: false,
				resource,
				responseType: payload.responseType
			};
		})
	};
};

const throwError = async (input: Response) => {
	// object: returns error as error property
	// response: returns error as body
	if (!input.ok && input.headers.get('rpc-response-type') !== 'object' && input.headers.get('rpc-response-type') !== 'response') {
		const body = util.safeParse(await util.readStream(input.body));

		if (isPlainObject(body)) {
			throw HttpError.fromJson(body as HttpError.Json);
		}

		throw new HttpError(input.status, isString(body) ? body : input.statusText);
	}

	return null;
};

class RpcProxyRequestOptions {
	public body: Blob | null;
	public ephemeralCacheTtlSeconds: number;
	public headers: Headers;
	public signal: AbortSignal | null;

	constructor(options?: Partial<Omit<RpcProxyRequestOptions, 'toJson'>>) {
		this.body = options?.body || null;
		this.ephemeralCacheTtlSeconds = isNumber(options?.ephemeralCacheTtlSeconds) ? options.ephemeralCacheTtlSeconds : 1;
		this.headers = options?.headers || new Headers();
		this.signal = options?.signal || null;
	}

	toJson() {
		return {
			body: !isNil(this.body),
			ephemeralCacheTtlSeconds: this.ephemeralCacheTtlSeconds,
			headers: headers.toJson(this.headers),
			signal: this.signal
		};
	}
}

export { RpcProxy, RpcProxyRequestOptions };
export default {
	create,
	createRequest,
	createResponse,
	createTestCaller,
	payloadToRequest,
	throwError
};
