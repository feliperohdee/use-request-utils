import { afterAll, beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import HttpError from 'use-http-error';
import z, { ZodError } from 'zod';

import Request from './request';
import Rpc, { DEFAULT_CACHE_TTL_SECONDS } from './rpc';
import rpcProxy from './rpc-proxy';
import RpcContext from './rpc-context';
import RpcResponse from './rpc-response';
import util from './util';

const schema = z.object({
	a: z.number()
});

class RpcSpec2 extends Rpc {
	constructor() {
		super({
			defaultResponseHeaders: new Headers({
				'rpc-init-2': 'true'
			})
		});
	}

	resource1() {
		return { a: 1 };
	}

	async $onBeforeRequest(rpc: Rpc.Request) {
		return rpc;
	}

	async $onAfterResponse(res: Rpc.Response) {
		return res;
	}
}

class RpcSpec1 extends Rpc {
	public child = new RpcSpec2();

	constructor(options: Rpc.Options) {
		super({
			cache: options.cache,
			defaultResponseHeaders: new Headers({
				'rpc-init-1': 'true'
			})
		});
	}

	resource1() {
		return { a: 1 };
	}
}

const nonRpcFn = () => {
	throw new Error('Forbidden');
};

class NonRpc {
	fn() {
		throw new Error('Forbidden');
	}
}

class RpcSpec extends Rpc {
	public nonRpcFn = nonRpcFn;
	public nonRpc = new NonRpc();

	public child = new RpcSpec1({
		cache: this.cache
	});

	resource1(string: string, array: number[], object: { a: number }) {
		this.context.set('args', {
			string,
			array,
			object
		});

		return this.context.toJson();
	}

	resource2() {
		this.context.defaultResponseMeta = {
			headers: new Headers({
				'edge-resource-2': 'true'
			}),
			status: 201
		};

		return { a: 2 };
	}

	resource3() {
		this.context.defaultResponseMeta = {
			headers: new Headers({
				'edge-resource-3': 'false',
				'edge-resource-33': 'true'
			}),
			status: 202
		};

		return this.createResponse(
			{ a: 3 },
			{
				headers: new Headers({ 'edge-resource-3': 'true' }),
				status: 201
			}
		);
	}

	resource4() {
		this.context.defaultResponseMeta = {
			headers: new Headers({
				'edge-resource-4': 'false',
				'edge-resource-44': 'true'
			}),
			status: 201
		};

		return this.createResponse(
			{ a: 4 },
			{
				headers: new Headers({ 'edge-resource-4': 'true' })
			}
		);
	}

	resourceBoolean() {
		return false;
	}

	resourceError() {
		throw new Error('Internal Server Error');
	}

	resourceHttpError() {
		throw new HttpError(404, 'Not Found', {
			context: { 'edge-resource-http-error': 'true' },
			headers: new Headers({ 'edge-resource-http-error': 'true' })
		});
	}

	resourceHttpErrorResponse() {
		return HttpError.response(404);
	}

	resourceNull() {
		return null;
	}

	resourceNumber() {
		return 1;
	}

	resourceResponse() {
		return Response.json({ a: 1 });
	}

	resourceString() {
		return 'string';
	}

	resourceStream() {
		return util.stringToStream('stream');
	}

	resourceZod() {
		schema.parse({ a: 'a' });
	}

	#private() {
		throw new Error('Forbidden');
	}

	_private() {
		throw new Error('Forbidden');
	}

	$private() {
		throw new Error('Forbidden');
	}

	async $onBeforeRequest(rpc: Rpc.Request) {
		return rpc;
	}

	async $onAfterResponse(res: Rpc.Response) {
		return res;
	}
}

describe('/rpc', () => {
	let cache: Rpc.CacheInterface;
	let cacheWrapMissImplementation: (
		key: string,
		revalidateFunction: Rpc.CacheRevalidateFunction,
		options?: { json?: boolean; ttlSeconds?: number }
	) => Promise<any>;
	let req: Request;
	let root: RpcSpec;

	beforeAll(() => {
		HttpError.setIncludeStack(false);
		Rpc.setErrorTransformer((rpc: Rpc.Request, err: Error) => {
			if (err instanceof ZodError) {
				return new HttpError(400, 'Validation Error', {
					context: {
						rpc,
						errors: err.errors
					}
				});
			}

			const httpError = HttpError.wrap(err);

			httpError.setContext({ rpc });

			return httpError;
		});
	});

	beforeEach(() => {
		const cacheSet = vi.fn();

		cacheWrapMissImplementation = async (key, revalidateFunction, options) => {
			const { response, setOptions } = await revalidateFunction(key);

			if (setOptions) {
				cacheSet(key, response.clone(), setOptions, options?.json ?? false);
			}

			return response;
		};

		cache = {
			set: cacheSet,
			wrap: vi.fn(cacheWrapMissImplementation)
		};

		req = new Request('http://localhost', {
			headers: { 'content-type': 'application/json' }
		});
		root = new RpcSpec({ cache });

		vi.spyOn(root, '$onAfterResponse');
		vi.spyOn(root, '$onBeforeRequest');
		vi.spyOn(root, 'resource1');
		vi.spyOn(root, 'resource2');
		vi.spyOn(root, 'resourceBoolean');
		vi.spyOn(root, 'resourceError');
		vi.spyOn(root, 'resourceHttpError');
		vi.spyOn(root, 'resourceHttpErrorResponse');
		vi.spyOn(root, 'resourceNull');
		vi.spyOn(root, 'resourceNumber');
		vi.spyOn(root, 'resourceResponse');
		vi.spyOn(root, 'resourceStream');
		vi.spyOn(root, 'resourceString');
		vi.spyOn(root, 'resourceZod');
		vi.spyOn(root.child, 'resource1');
		vi.spyOn(root.child.child, '$onAfterResponse');
		vi.spyOn(root.child.child, '$onBeforeRequest');
		vi.spyOn(root.child.child, 'resource1');
	});

	afterAll(() => {
		HttpError.setIncludeStack(true);
		Rpc.restoreErrorTransformer();
	});

	describe('call', () => {
		beforeEach(() => {
			// @ts-expect-error
			vi.spyOn(root, 'tryCached').mockImplementation(async (_, fn) => {
				return fn();
			});
		});

		it('should returns 400 error for invalid request', async () => {
			// @ts-expect-error
			const res = await root.call('', req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				...HttpError.json(400),
				context: { rpc: '' }
			});
			expect(res.status).toEqual(400);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it(`should returns 404 for resources which aren't RPC's direct property`, async () => {
			for await (const resource of ['nonRpcFn', 'nonRpc.fn']) {
				const rpc: Rpc.Request = {
					args: [],
					batch: false,
					resource,
					responseType: ''
				};

				// @ts-expect-error
				const res = await root.call(rpc, req);
				const body = await rpcProxy.createResponse(res);

				expect(body).toEqual({
					context: {
						rpc: {
							args: [],
							batch: false,
							resource,
							responseType: ''
						}
					},
					message: 'Resource not found',
					stack: [],
					status: 404
				});
				expect(res.status).toEqual(404);
				expect(res.headers).toEqual(
					new Headers({
						'content-type': 'application/json'
					})
				);
			}
		});

		it('should returns 404 error for non-existent resource', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'nonExistentResource',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				context: {
					rpc: {
						args: [],
						batch: false,
						resource: 'nonExistentResource',
						responseType: ''
					}
				},
				message: 'Resource not found',
				stack: [],
				status: 404
			});
			expect(res.status).toEqual(404);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should returns 400 on zod error', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceZod',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual(
				new HttpError(400, 'Validation Error', {
					context: {
						rpc: {
							args: [],
							batch: false,
							resource: 'resourceZod',
							responseType: ''
						},
						errors: [
							{
								code: 'invalid_type',
								expected: 'number',
								received: 'string',
								path: ['a'],
								message: 'Expected number, received string'
							}
						]
					}
				}).toJson()
			);
			expect(res.status).toEqual(400);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works', async () => {
			const rpc: Rpc.Request = {
				args: ['a', [1, 2], { a: 1 }],
				batch: false,
				resource: 'resource1',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			// @ts-expect-error
			expect(root.tryCached).toHaveBeenCalledWith(rpc, expect.any(Function));
			// @ts-expect-error
			expect(vi.mocked(root.tryCached).mock.instances[0]).toBeInstanceOf(RpcSpec);
			expect(root.resource1).toHaveBeenCalledWith('a', [1, 2], { a: 1 });

			expect(body).toEqual({
				cf: {},
				data: { args: { string: 'a', array: [1, 2], object: { a: 1 } } },
				headers: { 'content-type': 'application/json' }
			});
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with context.reponseMeta', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource2',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({ a: 2 });
			expect(res.status).toEqual(201);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-2': 'true'
				})
			);
		});

		it('should works merging context.reponseMeta keeping status', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource3',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({ a: 3 });
			expect(res.status).toEqual(201);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-3': 'true',
					'edge-resource-33': 'true'
				})
			);
		});

		it('should works merging context.reponseMeta', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource4',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({ a: 4 });
			expect(res.status).toEqual(201);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-4': 'true',
					'edge-resource-44': 'true'
				})
			);
		});

		it('should works with boolean', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceBoolean',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toBeFalsy();
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with error', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceError',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				...HttpError.json(500),
				context: { rpc }
			});
			expect(res.status).toEqual(500);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with HttpError', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceHttpError',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				context: {
					'edge-resource-http-error': 'true',
					rpc: {
						args: [],
						batch: false,
						resource: 'resourceHttpError',
						responseType: ''
					}
				},
				message: 'Not Found',
				stack: [],
				status: 404
			});
			expect(res.status).toEqual(404);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-http-error': 'true'
				})
			);
		});

		it('should works with HttpError.response', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceHttpErrorResponse',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				context: {},
				message: 'Not Found',
				stack: [],
				status: 404
			});
			expect(res.status).toEqual(404);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with null', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceNull',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toBeNull();
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with number', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceNumber',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual(1);
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with Response and rpc.responseType = "object"', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceResponse',
				responseType: 'object'
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				body: { a: 1 },
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				})
			);
		});

		it('should works with Response and rpc.responseType = "response"', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceResponse',
				responseType: 'response'
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = (await rpcProxy.createResponse(res)) as Response;

			expect(await body.json()).toEqual({ a: 1 });
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should works with string', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceString',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual('string');
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(new Headers({ 'content-type': 'text/plain;charset=UTF-8' }));
		});

		it('should works with stream', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resourceStream',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual('stream');
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/octet-stream' }));
		});

		it('should works with child', async () => {
			const rpc: Rpc.Request = {
				args: ['a', [1, 2], { a: 1 }],
				batch: false,
				resource: 'child.resource1',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			// @ts-expect-error
			expect(root.tryCached).toHaveBeenCalledWith(rpc, expect.any(Function));
			// @ts-expect-error
			expect(vi.mocked(root.tryCached).mock.instances[0]).toBeInstanceOf(RpcSpec1);

			expect(root.child.resource1).toHaveBeenCalledWith('a', [1, 2], { a: 1 });

			expect(body).toEqual({ a: 1 });
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-init-1': 'true'
				})
			);
		});

		it('should works with child child', async () => {
			const rpc: Rpc.Request = {
				args: ['a', [1, 2], { a: 1 }],
				batch: false,
				resource: 'child.child.resource1',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.call(rpc, req);
			const body = await rpcProxy.createResponse(res);

			// @ts-expect-error
			expect(root.tryCached).toHaveBeenCalledWith(rpc, expect.any(Function));
			// @ts-expect-error
			expect(vi.mocked(root.tryCached).mock.instances[0]).toBeInstanceOf(RpcSpec2);

			expect(root.child.child.resource1).toHaveBeenCalledWith('a', [1, 2], { a: 1 });

			expect(body).toEqual({ a: 1 });
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-init-2': 'true'
				})
			);
		});

		it('should works with hooks', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource1',
				responseType: ''
			};

			// @ts-expect-error
			await root.call(rpc, req);

			expect(root.$onBeforeRequest).toHaveBeenCalledWith(rpc, req);
			expect(root.$onAfterResponse).toHaveBeenCalledWith(expect.any(Response), rpc, req);
		});

		it('should works with child hooks', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'child.child.resource1',
				responseType: ''
			};

			// @ts-expect-error
			await root.call(rpc, req);

			expect(root.$onBeforeRequest).toHaveBeenCalledWith(rpc, req);
			expect(root.child.child.$onBeforeRequest).toHaveBeenCalledWith(rpc, req);
			expect(root.$onAfterResponse).toHaveBeenCalledWith(expect.any(Response), rpc, req);
			expect(root.child.child.$onAfterResponse).toHaveBeenCalledWith(expect.any(Response), rpc, req);
		});
	});

	describe('callMany', () => {
		it('should returns 400 error for invalid request', async () => {
			// @ts-expect-error
			const res = await root.callMany('', req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual(HttpError.json(400));
			expect(res.status).toEqual(400);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should returns 400 if rpc.batch = false', async () => {
			// @ts-expect-error
			const res = await root.callMany(
				{
					args: [],
					batch: false,
					resource: 'batch',
					responseType: ''
				},
				req
			);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual(HttpError.json(400));
			expect(res.status).toEqual(400);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works', async () => {
			const rpc: Rpc.Request = {
				args: [
					{ args: [], batch: false, resource: 'resource1', responseType: '' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'object' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'response' },
					{ args: [], batch: false, resource: 'resource2', responseType: '' },
					{ args: [], batch: false, resource: 'resource2', responseType: 'object' },
					{ args: [], batch: false, resource: 'resource2', responseType: 'response' },
					{ args: [], batch: false, resource: 'child.resource1', responseType: '' },
					{ args: [], batch: false, resource: 'child.resource1', responseType: 'object' },
					{ args: [], batch: false, resource: 'child.resource1', responseType: 'response' },
					{ args: [], batch: false, resource: 'child.child.resource1', responseType: '' },
					{ args: [], batch: false, resource: 'child.child.resource1', responseType: 'object' },
					{ args: [], batch: false, resource: 'child.child.resource1', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceBoolean', responseType: '' },
					{ args: [], batch: false, resource: 'resourceBoolean', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceBoolean', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceError', responseType: '' },
					{ args: [], batch: false, resource: 'resourceError', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceError', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceHttpError', responseType: '' },
					{ args: [], batch: false, resource: 'resourceHttpError', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: '' },
					{ args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceNull', responseType: '' },
					{ args: [], batch: false, resource: 'resourceNull', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceNull', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceNumber', responseType: '' },
					{ args: [], batch: false, resource: 'resourceNumber', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceNumber', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceResponse', responseType: '' },
					{ args: [], batch: false, resource: 'resourceResponse', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceResponse', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceString', responseType: '' },
					{ args: [], batch: false, resource: 'resourceString', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceString', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceStream', responseType: '' },
					{ args: [], batch: false, resource: 'resourceStream', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceStream', responseType: 'response' },
					{ args: [], batch: false, resource: 'resourceZod', responseType: '' },
					{ args: [], batch: false, resource: 'resourceZod', responseType: 'object' },
					{ args: [], batch: false, resource: 'resourceZod', responseType: 'response' }
				],
				batch: true,
				resource: 'batch',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.callMany(rpc, req);
			const body = await rpcProxy.createResponse<any>(res);

			expect(root.resource1).toHaveBeenCalledTimes(1);
			expect(root.resource2).toHaveBeenCalledTimes(1);
			expect(root.child.resource1).toHaveBeenCalledTimes(1);
			expect(root.child.child.resource1).toHaveBeenCalledTimes(1);
			expect(root.resourceBoolean).toHaveBeenCalledTimes(1);
			expect(root.resourceError).toHaveBeenCalledTimes(1);
			expect(root.resourceHttpError).toHaveBeenCalledTimes(1);
			expect(root.resourceHttpErrorResponse).toHaveBeenCalledTimes(1);
			expect(root.resourceNull).toHaveBeenCalledTimes(1);
			expect(root.resourceNumber).toHaveBeenCalledTimes(1);
			expect(root.resourceResponse).toHaveBeenCalledTimes(1);
			expect(root.resourceString).toHaveBeenCalledTimes(1);
			expect(root.resourceStream).toHaveBeenCalledTimes(1);
			expect(root.resourceZod).toHaveBeenCalledTimes(1);

			// { args: [], batch: false, resource: 'resource1', responseType: '' }
			expect(body[0]).toEqual({
				cf: {},
				data: { args: {} },
				headers: {
					'content-type': 'application/json'
				}
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'object' }
			expect(body[1]).toEqual({
				body: {
					cf: {},
					data: { args: {} },
					headers: {
						'content-type': 'application/json'
					}
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'response' }
			expect(await body[2].json()).toEqual({
				cf: {},
				data: { args: {} },
				headers: {
					'content-type': 'application/json'
				}
			});
			expect(body[2].status).toEqual(200);
			expect(body[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resource2', responseType: '' }
			expect(body[3]).toEqual({ a: 2 });

			// { args: [], batch: false, resource: 'resource2', responseType: 'object' }
			expect(body[4]).toEqual({
				body: { a: 2 },
				headers: {
					'content-type': 'application/json',
					'edge-resource-2': 'true',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 201
			});

			// { args: [], batch: false, resource: 'resource2', responseType: 'response' }
			expect(await body[5].json()).toEqual({ a: 2 });
			expect(body[5].status).toEqual(201);
			expect(body[5].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-2': 'true',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'child.resource1', responseType: '' }
			expect(body[6]).toEqual({ a: 1 });

			// { args: [], batch: false, resource: 'child.resource1', responseType: 'object' }
			expect(body[7]).toEqual({
				body: { a: 1 },
				headers: {
					'content-type': 'application/json',
					'rpc-init-1': 'true',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'child.resource1', responseType: 'response' }
			expect(await body[8].json()).toEqual({ a: 1 });
			expect(body[8].status).toEqual(200);
			expect(body[8].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-init-1': 'true',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'child.child.resource1', responseType: '' }
			expect(body[9]).toEqual({ a: 1 });

			// { args: [], batch: false, resource: 'child.child.resource1', responseType: 'object' }
			expect(body[10]).toEqual({
				body: { a: 1 },
				headers: {
					'content-type': 'application/json',
					'rpc-init-2': 'true',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'child.child.resource1', responseType: 'response' }
			expect(await body[11].json()).toEqual({ a: 1 });
			expect(body[11].status).toEqual(200);
			expect(body[11].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-init-2': 'true',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceBoolean', responseType: '' }
			expect(body[12]).toBeFalsy();

			// { args: [], batch: false, resource: 'resourceBoolean', responseType: 'object' }
			expect(body[13]).toEqual({
				body: false,
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceBoolean', responseType: 'response' }
			expect(await body[14].json()).toBeFalsy();
			expect(body[14].status).toEqual(200);
			expect(body[14].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceError', responseType: '' }
			expect(body[15]).toBeNull();

			// { args: [], batch: false, resource: 'resourceError', responseType: 'object' }
			expect(body[16]).toEqual({
				body: {
					...HttpError.json(500),
					context: {
						rpc: {
							args: [],
							batch: false,
							resource: 'resourceError',
							responseType: ''
						}
					}
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: false,
				status: 500
			});

			// { args: [], batch: false, resource: 'resourceError', responseType: 'response' }
			expect(await body[17].json()).toEqual({
				...HttpError.json(500),
				context: {
					rpc: {
						args: [],
						batch: false,
						resource: 'resourceError',
						responseType: ''
					}
				}
			});
			expect(body[17].status).toEqual(500);
			expect(body[17].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceHttpError', responseType: '' }
			expect(body[18]).toBeNull();

			// { args: [], batch: false, resource: 'resourceHttpError', responseType: 'object' }
			expect(body[19]).toEqual({
				body: {
					context: {
						'edge-resource-http-error': 'true',
						rpc: {
							args: [],
							batch: false,
							resource: 'resourceHttpError',
							responseType: ''
						}
					},
					message: 'Not Found',
					stack: [],
					status: 404
				},
				headers: {
					'content-type': 'application/json',
					'edge-resource-http-error': 'true',
					'rpc-response-type': 'object'
				},
				ok: false,
				status: 404
			});

			// { args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: '' }
			expect(body[20]).toBeNull();

			// { args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: 'object' }
			expect(body[21]).toEqual({
				body: {
					context: {},
					message: 'Not Found',
					stack: [],
					status: 404
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: false,
				status: 404
			});

			// { args: [], batch: false, resource: 'resourceHttpErrorResponse', responseType: 'response' }
			expect(await body[22].json()).toEqual({
				context: {},
				message: 'Not Found',
				stack: [],
				status: 404
			});
			expect(body[22].status).toEqual(404);
			expect(body[22].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceNull', responseType: '' }
			expect(body[23]).toBeNull();

			// { args: [], batch: false, resource: 'resourceNull', responseType: 'object' }
			expect(body[24]).toEqual({
				body: null,
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceNull', responseType: 'response' }
			expect(await body[25].json()).toBeNull();
			expect(body[25].status).toEqual(200);
			expect(body[25].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceNumber', responseType: '' }
			expect(body[26]).toEqual(1);

			// { args: [], batch: false, resource: 'resourceNumber', responseType: 'object' }
			expect(body[27]).toEqual({
				body: 1,
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceNumber', responseType: 'response' }
			expect(await body[28].json()).toEqual(1);
			expect(body[28].status).toEqual(200);
			expect(body[28].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceResponse', responseType: '' }
			expect(body[29]).toEqual({ a: 1 });

			// { args: [], batch: false, resource: 'resourceResponse', responseType: 'object' }
			expect(body[30]).toEqual({
				body: { a: 1 },
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceResponse', responseType: 'response' }
			expect(await body[31].json()).toEqual({ a: 1 });
			expect(body[31].status).toEqual(200);
			expect(body[31].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceString', responseType: '' }
			expect(body[32]).toEqual('string');

			// { args: [], batch: false, resource: 'resourceString', responseType: 'object' }
			expect(body[33]).toEqual({
				body: 'string',
				headers: {
					'content-type': 'text/plain;charset=UTF-8',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceString', responseType: 'response' }
			expect(await body[34].text()).toEqual('string');
			expect(body[34].status).toEqual(200);
			expect(body[34].headers).toEqual(
				new Headers({
					'content-type': 'text/plain;charset=UTF-8',
					'rpc-response-type': 'response'
				})
			);

			// { args: [], batch: false, resource: 'resourceStream', responseType: '' }
			expect(body[35]).toEqual('stream');

			// { args: [], batch: false, resource: 'resourceStream', responseType: 'object' }
			expect(body[36]).toEqual({
				body: 'stream',
				headers: {
					'content-type': 'application/octet-stream',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resourceStream', responseType: 'response' }
			expect(await body[37].text()).toEqual('stream');

			// { args: [], batch: false, resource: 'resourceZod', responseType: '' }
			expect(body[38]).toBeNull();

			// { args: [], batch: false, resource: 'resourceZod', responseType: 'object' }
			expect(body[39]).toEqual({
				body: {
					context: {
						rpc: {
							args: [],
							batch: false,
							resource: 'resourceZod',
							responseType: ''
						},
						errors: [
							{
								code: 'invalid_type',
								expected: 'number',
								message: 'Expected number, received string',
								path: ['a'],
								received: 'string'
							}
						]
					},
					message: 'Validation Error',
					stack: [],
					status: 400
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: false,
				status: 400
			});

			// { args: [], batch: false, resource: 'resourceZod', responseType: 'response'
			expect(await body[40].json()).toEqual({
				context: {
					rpc: {
						args: [],
						batch: false,
						resource: 'resourceZod',
						responseType: ''
					},
					errors: [
						{
							code: 'invalid_type',
							expected: 'number',
							message: 'Expected number, received string',
							path: ['a'],
							received: 'string'
						}
					]
				},
				message: 'Validation Error',
				stack: [],
				status: 400
			});
			expect(body[40].status).toEqual(400);
			expect(body[40].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-batch': 'true'
				})
			);
		});

		it('should works with rpc.responseType = "object"', async () => {
			const rpc: Rpc.Request = {
				args: [
					{ args: [], batch: false, resource: 'resource1', responseType: '' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'object' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'response' }
				],
				batch: true,
				resource: 'batch',
				responseType: 'object'
			};

			// @ts-expect-error
			const res = await root.callMany(rpc, req);
			const { body, headers, ok, status } = await rpcProxy.createResponse<any>(res);

			// { args: [], batch: false, resource: 'resource1', responseType: '' }
			expect(body[0]).toEqual({
				cf: {},
				data: { args: {} },
				headers: {
					'content-type': 'application/json'
				}
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'object' }
			expect(body[1]).toEqual({
				body: {
					cf: {},
					data: { args: {} },
					headers: {
						'content-type': 'application/json'
					}
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'response' }
			expect(await body[2].json()).toEqual({
				cf: {},
				data: { args: {} },
				headers: {
					'content-type': 'application/json'
				}
			});
			expect(body[2].status).toEqual(200);
			expect(body[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);

			expect(ok).toBeTruthy();
			expect(status).toEqual(200);
			expect(headers).toEqual({
				'content-type': 'application/json',
				'rpc-response-batch': 'true',
				'rpc-response-type': 'object'
			});
		});

		it('should works with rpc.responseType = "response"', async () => {
			const rpc: Rpc.Request = {
				args: [
					{ args: [], batch: false, resource: 'resource1', responseType: '' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'object' },
					{ args: [], batch: false, resource: 'resource1', responseType: 'response' }
				],
				batch: true,
				resource: 'batch',
				responseType: 'response'
			};

			// @ts-expect-error
			const res = await root.callMany(rpc, req);
			const { body, headers, ok, status } = await (async () => {
				const { body, headers, ok, status } = await rpcProxy.createResponse<any>(res);

				return {
					body: util.safeParse(await util.readStream(body)),
					headers,
					ok,
					status
				};
			})();

			// { args: [], batch: false, resource: 'resource1', responseType: '' }
			expect(body[0]).toEqual({
				cf: {},
				data: { args: {} },
				headers: {
					'content-type': 'application/json'
				}
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'object' }
			expect(body[1]).toEqual({
				body: {
					cf: {},
					data: { args: {} },
					headers: {
						'content-type': 'application/json'
					}
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			// { args: [], batch: false, resource: 'resource1', responseType: 'response' }
			expect(body[2]).toEqual({
				body: {
					cf: {},
					data: { args: {} },
					headers: {
						'content-type': 'application/json'
					}
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				},
				ok: true,
				status: 200
			});

			expect(ok).toBeTruthy();
			expect(status).toEqual(200);
			expect(headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-batch': 'true',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should ignore invalid requests in an array', async () => {
			const rpc: Rpc.Request = {
				args: [
					{
						batch: false,
						args: ['a', [1, 2], { a: 1 }],
						resource: 'resource1',
						responseType: ''
					},
					{ invalidKey: 'value' } as unknown as Rpc.Request
				],
				batch: true,
				resource: 'batch',
				responseType: ''
			};

			// @ts-expect-error
			const res = await root.callMany(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual([
				{
					cf: {},
					data: {
						args: { string: 'a', array: [1, 2], object: { a: 1 } }
					},
					headers: { 'content-type': 'application/json' }
				}
			]);
		});
	});

	describe('createResponse', () => {
		it('should transform object', () => {
			const res = root.createResponse({ a: 1 });

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/json' }));
			expect(res.status).toEqual(200);
		});

		it('should transform object with init', () => {
			const res = root.createResponse(
				{ a: 1 },
				{
					headers: new Headers({ 'edge-header': 'true' }),
					status: 201
				}
			);

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-header': 'true'
				})
			);
			expect(res.status).toEqual(201);
		});

		it('should transform Response', () => {
			const res = root.createResponse(
				Response.json(
					{ a: 1 },
					{
						headers: new Headers({ 'edge-header': 'true' }),
						status: 201
					}
				)
			);

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-header': 'true'
				})
			);
			expect(res.status).toEqual(201);
		});

		it('should transform Response with init', () => {
			const res = root.createResponse(
				Response.json(
					{ a: 1 },
					{
						headers: new Headers({ 'edge-header': 'true' }),
						status: 201
					}
				),
				{
					headers: new Headers({ 'edge-header-1': 'true' }),
					status: 202
				}
			);

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-header': 'true',
					'edge-header-1': 'true'
				})
			);
			expect(res.status).toEqual(202);
		});

		it('should transform string', () => {
			const res = root.createResponse('string');

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'text/plain;charset=UTF-8'
				})
			);
			expect(res.status).toEqual(200);
		});

		it('should transform string with init', () => {
			const res = root.createResponse('string', {
				headers: new Headers({ 'edge-header': 'true' }),
				status: 201
			});

			expect(res).toBeInstanceOf(RpcResponse);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'text/plain;charset=UTF-8',
					'edge-header': 'true'
				})
			);
			expect(res.status).toEqual(201);
		});
	});

	describe('fetch', () => {
		beforeEach(() => {
			// @ts-expect-error
			vi.spyOn(root, 'call');
			// @ts-expect-error
			vi.spyOn(root, 'callMany');
		});

		it('should works with single request', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource1',
				responseType: ''
			};
			const res = await root.fetch(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				cf: {},
				data: { args: {} },
				headers: { 'content-type': 'application/json' }
			});
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should works with single request and rpc.responseType = "object"', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource1',
				responseType: 'object'
			};
			const res = await root.fetch(rpc, req);
			const body = await rpcProxy.createResponse(res);

			expect(body).toEqual({
				body: {
					cf: {},
					data: { args: {} },
					headers: { 'content-type': 'application/json' }
				},
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				})
			);
		});

		it('should works with single request and rpc.responseType = "response"', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: false,
				resource: 'resource1',
				responseType: 'response'
			};
			const res = await root.fetch(rpc, req);
			const body = (await rpcProxy.createResponse(res)) as Response;

			expect(await body.json()).toEqual({
				cf: {},
				data: { args: {} },
				headers: { 'content-type': 'application/json' }
			});
			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should works with batch request', async () => {
			const rpc: Rpc.Request = {
				args: [
					{ args: [], batch: false, resource: 'resource2', responseType: '' },
					{ args: [], batch: false, resource: 'resource2', responseType: 'object' },
					{ args: [], batch: false, resource: 'resource2', responseType: 'response' }
				],
				batch: true,
				resource: 'batch',
				responseType: ''
			};

			const res = await root.fetch(rpc, req);
			const body = await rpcProxy.createResponse<any[]>(res);

			expect(body[0]).toEqual({ a: 2 });
			expect(body[1]).toEqual({
				body: { a: 2 },
				headers: {
					'content-type': 'application/json',
					'edge-resource-2': 'true',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 201
			});
			expect(await body[2].json()).toEqual({ a: 2 });
			expect(body[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-resource-2': 'true',
					'rpc-response-type': 'response'
				})
			);
			expect(body[2].status).toEqual(201);

			expect(res.status).toEqual(200);
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-batch': 'true'
				})
			);
		});
	});

	describe('mapResource', () => {
		it('should works', () => {
			// @ts-expect-error
			const res = root.mapResource('resource1');

			expect(res).toEqual({
				fn: root.resource1,
				parents: [root]
			});
		});

		it('should works with child', () => {
			// @ts-expect-error
			const res = root.mapResource('child.resource1');

			expect(res).toEqual({
				fn: root.child.resource1,
				parents: [root, root.child]
			});

			// @ts-expect-error
			expect(root.cache).toBe(cache);
			// @ts-expect-error
			expect(root.child.cache).toBe(cache);
		});

		it('should works with child child', () => {
			// @ts-expect-error
			const res = root.mapResource('child.child.resource1');

			expect(res).toEqual({
				fn: root.child.child.resource1,
				parents: [root, root.child, root.child.child]
			});

			// @ts-expect-error
			expect(root.cache).toBe(cache);
			// @ts-expect-error
			expect(root.child.cache).toBe(cache);
			// @ts-expect-error
			expect(root.child.child.cache).toBe(cache);
		});

		it('should works with non-existent resource', () => {
			// @ts-expect-error
			const res = root.mapResource('nonExistentResource');

			expect(res).toEqual({
				fn: null,
				parents: []
			});
		});

		it(`should works for resources which aren't direct RPC's property`, () => {
			for (const resource of ['nonRpcFn', 'nonRpc.fn']) {
				// @ts-expect-error
				const res = root.mapResource(resource);

				expect(res).toEqual({
					fn: null,
					parents: []
				});
			}
		});

		it(`should works for private resources`, () => {
			for (const resource of ['#private', '_private', '$private']) {
				// @ts-expect-error
				const res = root.mapResource(resource);

				expect(res).toEqual({
					fn: null,
					parents: []
				});
			}
		});
	});

	describe('request', () => {
		it('should works', () => {
			// @ts-expect-error
			const { context } = root;

			expect(context).toBeInstanceOf(RpcContext);
		});
	});

	describe('tryCached', () => {
		let fn: Mock;
		let rpc: Rpc.Request;

		beforeEach(() => {
			fn = vi.fn(async () => {
				return new RpcResponse({ a: 'fresh' }, { cache: true });
			});

			rpc = {
				args: [{ a: 1 }],
				batch: false,
				resource: 'a',
				responseType: ''
			};

			vi.mocked(cache.wrap).mockResolvedValue(
				Response.json(
					{
						a: 'cached'
					},
					{
						headers: { 'edge-cache-status': 'HIT' }
					}
				) as RpcResponse<{ a: string }>
			);
		});

		it('should not handle if not cache', async () => {
			// @ts-expect-error
			root.cache = null;

			// @ts-expect-error
			const res = await root.tryCached(rpc, fn);

			expect(await res.json()).toEqual({ a: 'fresh' });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should returns cached', async () => {
			// @ts-expect-error
			const res = await root.tryCached(rpc, fn);

			expect(cache.wrap).toHaveBeenCalledWith('rpc_a_[{"a":1}]', expect.any(Function), { json: true });
			expect(cache.set).not.toHaveBeenCalled();

			expect(await res.json()).toEqual({ a: 'cached' });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-cache-status': 'HIT'
				})
			);
		});

		it('should returns fresh', async () => {
			vi.mocked(cache.wrap).mockImplementation(cacheWrapMissImplementation);

			// @ts-expect-error
			const res = await root.tryCached(rpc, fn);

			expect(cache.wrap).toHaveBeenCalledWith('rpc_a_[{"a":1}]', expect.any(Function), { json: true });
			expect(cache.set).toHaveBeenCalledWith(
				'rpc_a_[{"a":1}]',
				expect.any(Response),
				{ tags: [], ttlSeconds: DEFAULT_CACHE_TTL_SECONDS },
				true
			);

			const setCalls = vi.mocked(cache.set).mock.calls;

			expect(await setCalls[0][1].json()).toEqual({ a: 'fresh' });
			expect(await res.json()).toEqual({ a: 'fresh' });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should returns fresh with cache options', async () => {
			vi.mocked(cache.wrap).mockImplementation(cacheWrapMissImplementation);

			fn = vi.fn(async () => {
				return new RpcResponse(
					{ a: 'fresh' },
					{
						cache: {
							tags: ['a', 'b'],
							ttlSeconds: 100
						}
					}
				);
			});

			// @ts-expect-error
			const res = await root.tryCached(rpc, fn);

			expect(cache.wrap).toHaveBeenCalledWith('rpc_a_[{"a":1}]', expect.any(Function), { json: true });
			expect(cache.set).toHaveBeenCalledWith('rpc_a_[{"a":1}]', expect.any(Response), { tags: ['a', 'b'], ttlSeconds: 100 }, true);

			const setCalls = vi.mocked(cache.set).mock.calls;

			expect(await setCalls[0][1].json()).toEqual({ a: 'fresh' });
			expect(await res.json()).toEqual({ a: 'fresh' });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});

		it('should returns fresh and not set cache if cache === false', async () => {
			vi.mocked(cache.wrap).mockImplementation(cacheWrapMissImplementation);

			fn = vi.fn(async () => {
				return new RpcResponse(
					{ a: 'fresh' },
					{
						cache: false
					}
				);
			});

			// @ts-expect-error
			const res = await root.tryCached(rpc, fn);

			expect(cache.wrap).toHaveBeenCalledWith('rpc_a_[{"a":1}]', expect.any(Function), { json: true });
			expect(cache.set).not.toHaveBeenCalled();

			expect(await res.json()).toEqual({ a: 'fresh' });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json'
				})
			);
		});
	});

	describe('validRequest', () => {
		it('should returns true', () => {
			// @ts-expect-error
			const res = root.validRequest({ args: [], resource: 'resource1' });

			expect(res).toBeTruthy();
		});

		it('should returns false if not plain object', () => {
			// @ts-expect-error
			const res = root.validRequest('string');

			expect(res).toBeFalsy();
		});

		it('should returns false if resource is not string', () => {
			// @ts-expect-error
			const res = root.validRequest({ args: [], resource: 1 });

			expect(res).toBeFalsy();
		});

		it('should returns false if resource is ==== ""', () => {
			// @ts-expect-error
			const res = root.validRequest({ args: [], resource: '' });

			expect(res).toBeFalsy();
		});

		it('should returns false for invalid reserved resources', () => {
			for (const resource of ['call', 'callMany', 'createResponse', 'fetch', 'mapResource', 'request', 'tryCached', 'validRequest']) {
				// @ts-expect-error
				const res = root.validRequest({ args: [], resource });

				expect(res).toBeFalsy();
			}
		});

		it('should returns false if args is not array', () => {
			// @ts-expect-error
			const res = root.validRequest({ resource: 'resource1', args: {} });

			expect(res).toBeFalsy();
		});
	});
});
