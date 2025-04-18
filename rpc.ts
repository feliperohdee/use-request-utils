import filter from 'lodash/filter';
import flatMap from 'lodash/flatMap';
import get from 'lodash/get';
import has from 'lodash/has';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import last from 'lodash/last';
import map from 'lodash/map';
import pick from 'lodash/pick';
import size from 'lodash/size';
import startsWith from 'lodash/startsWith';
import toPath from 'lodash/toPath';
import uniqBy from 'lodash/uniqBy';

import { AsyncLocalStorage } from 'node:async_hooks';
import headers from 'use-request-utils/headers';
import HttpError from 'use-http-error';
import JSON from 'use-json';

import Request from './request';
import RpcContext from './rpc-context';
import RpcResponse from './rpc-response';
import util from './util';

type HttpRequest = Request;

namespace Rpc {
	export type CacheInterface = {
		wrap: (
			key: string,
			fn: CacheRevalidateFunction,
			options?: {
				json?: boolean;
				tags?: string[];
				ttlSeconds?: number;
			}
		) => Promise<Response>;
		set: (
			key: string,
			response: Response,
			setOptions: {
				tags?: string[];
				ttlSeconds?: number;
			}
		) => void;
	};
	export type CacheRevalidateFunction = (key: string) => Promise<{
		response: Response;
		setOptions: {
			tags?: string[];
			ttlSeconds?: number;
		} | null;
	}>;
	export type CacheOptions =
		| boolean
		| {
				tags?: string[];
				ttlSeconds?: number;
		  };

	export type Options = {
		cache?: CacheInterface | null;
		defaultResponseHeaders?: Headers;
		transformError?: (rpc: Request, err: Error) => HttpError;
	};

	export type Request = {
		args: any[];
		batch: boolean;
		resource: string;
		responseType: ResponseType;
	};

	export type Response<T = unknown> = RpcResponse<T>;
	export type ResponseBatch = {
		body: string;
		contentType: string;
		headers: Record<string, string>;
		ok: boolean;
		responseType: ResponseType;
		status: number;
	};
	export type ResponseObject<T = unknown> = {
		body: T;
		headers: Record<string, string>;
		ok: boolean;
		status: number;
	};
	export type ResponseType = '' | 'object' | 'response';

	export type ResponseInit = {
		cache?: CacheOptions;
		headers?: Headers;
		status?: number;
	};
}

const DEFAULT_CACHE_TTL_SECONDS = 86400; // 1 day
const requestStorage = new AsyncLocalStorage<{ context: RpcContext }>();

const defaultErrorTransformer = (rpc: Rpc.Request, err: Error) => {
	const httpError = HttpError.wrap(err);

	httpError.setContext({ rpc });

	return httpError;
};

class Rpc {
	static errorTransformer = defaultErrorTransformer;
	static restoreErrorTransformer() {
		Rpc.errorTransformer = defaultErrorTransformer;
	}

	static setErrorTransformer(transformError: (rpc: Rpc.Request, err: Error) => HttpError) {
		Rpc.errorTransformer = transformError;
	}

	protected cache: Rpc.CacheInterface | null;
	protected defaultResponseHeaders: Headers;

	constructor(options?: Rpc.Options) {
		this.cache = options?.cache || null;
		this.defaultResponseHeaders = options?.defaultResponseHeaders || new Headers();
	}

	private async call(rpc: Rpc.Request, req: Request): Promise<Response> {
		const context = new RpcContext({
			body: req.body,
			cf: req.cf || {},
			headers: req.headers
		});

		const res = await requestStorage.run({ context }, async () => {
			try {
				if (!this.validRequest(rpc)) {
					throw new HttpError(400);
				}

				const { fn, parents } = this.mapResource(rpc.resource);

				if (!isFunction(fn)) {
					throw new HttpError(404, 'Resource not found');
				}

				for (let parent of parents) {
					if (parent.$onBeforeRequest) {
						const onBeforeRequestRes = await parent.$onBeforeRequest.call(parent, rpc, req);

						if (onBeforeRequestRes) {
							rpc = onBeforeRequestRes;
						}
					}
				}

				const current = last(parents) as Rpc;

				return await this.tryCached.call(current, rpc, async () => {
					let res = await (async () => {
						const res = await fn.call(current, ...rpc.args);

						if (!(res instanceof RpcResponse)) {
							return this.createResponse(res);
						}

						return res;
					})();

					res.addDefaultHeaders(current.defaultResponseHeaders);

					for (let parent of parents) {
						if (parent.$onAfterResponse) {
							const onAfterResponseRes = await parent.$onAfterResponse.call(parent, res, rpc, req);

							if (onAfterResponseRes) {
								res = onAfterResponseRes;
							}
						}
					}

					return res;
				});
			} catch (err) {
				const httpError = Rpc.errorTransformer(rpc, err as Error);

				return this.createResponse(httpError.toJson(), {
					headers: headers.merge(this.defaultResponseHeaders, httpError.headers),
					status: httpError.status
				});
			}
		});

		if (rpc.responseType) {
			res.headers.set('rpc-response-type', rpc.responseType);
		}

		return res;
	}

	private async callMany(rpc: Rpc.Request, req: Request): Promise<Response> {
		if (!rpc.batch || !this.validRequest(rpc)) {
			return this.createResponse(HttpError.json(400), {
				headers: this.defaultResponseHeaders,
				status: 400
			});
		}

		const requests = filter(rpc.args, this.validRequest).map(rpc => {
			const key = JSON.stringify(pick(rpc, ['args', 'resource']));

			return { key, rpc };
		});

		const uniqueRequests = uniqBy(requests, 'key');
		const uniqueResponses = await Promise.all(
			map(uniqueRequests, async ({ key, rpc }) => {
				try {
					return {
						key,
						res: await this.call(rpc, req)
					};
				} catch (err) {
					const httpError = HttpError.wrap(err as Error);

					return {
						key,
						res: Response.json(httpError.toJson(), {
							headers: { 'content-type': 'application/json' },
							status: httpError.status
						})
					};
				}
			})
		);

		const responses = flatMap(uniqueResponses, ({ key, res }) => {
			const requestsUsingThisResponse = filter(requests, { key });
			const lastRequestUsingThisResponse = last(requestsUsingThisResponse);

			return map(requestsUsingThisResponse, ({ rpc }) => {
				// clone all responses except the last one
				const clone = rpc !== lastRequestUsingThisResponse?.rpc;

				if (clone) {
					return {
						clone,
						key,
						res: res.clone()
					};
				}

				return {
					clone,
					key,
					res
				};
			});
		});

		const result: Rpc.ResponseBatch[] = await Promise.all(
			map(responses, async ({ res }, index) => {
				const { responseType = '' } = requests[index].rpc;

				if (responseType) {
					res.headers.set('rpc-response-type', responseType);
				}

				return {
					body: await util.readStream(res.body),
					contentType: res.headers.get('content-type') || 'text/plain',
					headers: headers.toJson(res.headers),
					ok: res.ok,
					responseType,
					status: res.status
				};
			})
		);

		const res = Response.json(result, {
			headers: { 'rpc-response-batch': 'true' }
		});

		if (rpc.responseType !== '') {
			res.headers.set('rpc-response-type', rpc.responseType);
		}

		return res;
	}

	protected get context(): RpcContext {
		const store = requestStorage.getStore();

		if (!store?.context) {
			return new RpcContext({
				body: null,
				cf: {},
				headers: new Headers()
			});
		}

		return store.context;
	}

	createResponse<T>(input: T, init?: Rpc.ResponseInit): RpcResponse<T> {
		const { defaultResponseMeta } = this.context;

		if (input instanceof Response) {
			return this.createResponse(input.body, {
				headers: headers.merge(input.headers, init?.headers),
				status: init?.status || input.status
			});
		}

		return new RpcResponse(input, {
			...init,
			headers: headers.merge(defaultResponseMeta?.headers, init?.headers),
			status: init?.status || defaultResponseMeta?.status || 200
		});
	}

	async fetch(rpc: Rpc.Request, req: Request): Promise<Response> {
		if (rpc.batch) {
			return this.callMany(rpc, req);
		}

		return this.call(rpc, req);
	}

	private mapResource(resource: string): { fn: ((args?: any) => Promise<unknown>) | null; parents: Rpc[] } {
		let fn = get(this, resource);

		if (isFunction(fn)) {
			let resourceParts = toPath(resource);
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			let instance: any = this;
			let parents: Rpc[] = [this];

			const resourceName = last(resourceParts) as string;
			const allowPrivateMethods = '__DANGEROUSLY_ALLOW_PRIVATE_METHODS__' in this && this.__DANGEROUSLY_ALLOW_PRIVATE_METHODS__;

			if (!allowPrivateMethods && (startsWith(resourceName, '#') || startsWith(resourceName, '_') || startsWith(resourceName, '$'))) {
				return { fn: null, parents: [] };
			}

			for (let i = 0; i < resourceParts.length - 1; i++) {
				instance = get(instance, resourceParts[i]);

				if (isNil(instance.cache) && this.cache) {
					instance.cache = this.cache;
				}

				parents = [...parents, instance];
			}

			const resourceParent = last(parents) as Rpc;
			const resourceParentPrototype = Object.getPrototypeOf(resourceParent);
			const resourceDirectRpcProperty = has(resourceParentPrototype, resourceName);

			if (!(resourceParentPrototype instanceof Rpc) || !resourceDirectRpcProperty) {
				return { fn: null, parents: [] };
			}

			return { fn, parents };
		}

		return { fn: null, parents: [] };
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async $onBeforeRequest(rpc: Rpc.Request, req: HttpRequest): Promise<void | Rpc.Request> {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async $onAfterResponse(res: RpcResponse, rpc: Rpc.Request, req: HttpRequest): Promise<void | RpcResponse> {}

	private async tryCached(rpc: Rpc.Request, fn: () => Promise<RpcResponse>): Promise<Response> {
		if (this.cache) {
			const key = `rpc_${rpc.resource}_${JSON.stringify(rpc.args)}`;
			const cached = await this.cache.wrap(
				key,
				async () => {
					const res = await fn();

					if (isObject(res.cache) || res.cache === true) {
						return {
							response: res,
							setOptions: res.cache === true ? { tags: [], ttlSeconds: DEFAULT_CACHE_TTL_SECONDS } : res.cache
						};
					}

					return { response: res, setOptions: null };
				},
				{ json: true }
			);

			if (cached) {
				return cached;
			}
		}

		return fn();
	}

	private validRequest(rpc: Rpc.Request): boolean {
		if (!isPlainObject(rpc)) {
			return false;
		}

		if (!isString(rpc.resource) || !size(rpc.resource)) {
			return false;
		}

		if (
			rpc.resource === 'call' ||
			rpc.resource === 'callMany' ||
			rpc.resource === 'createResponse' ||
			rpc.resource === 'fetch' ||
			rpc.resource === 'mapResource' ||
			rpc.resource === 'request' ||
			rpc.resource === 'tryCached' ||
			rpc.resource === 'validRequest'
		) {
			return false;
		}

		if (!isNil(rpc.args) && !isArray(rpc.args)) {
			return false;
		}

		return true;
	}
}

export { DEFAULT_CACHE_TTL_SECONDS };
export default Rpc;
