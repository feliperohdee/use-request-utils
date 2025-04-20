import { afterAll, beforeAll, beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import headers from 'use-request-utils/headers';
import HttpError from 'use-http-error';
import JSON from 'use-json';

import Rpc from './rpc';
import RpcResponse from './rpc-response';
import rpcProxy, { RpcProxy, RpcProxyRequestOptions } from './rpc-proxy';
import util from './util';

class RpcSpec extends Rpc {
	async a(args: { value: number }) {
		return this.createResponse(
			{
				a: args.value
			},
			{
				headers: new Headers({
					'rpc-a': 'a'
				}),
				status: 200
			}
		);
	}

	async b(args: { value: number }) {
		return Response.json({
			a: args.value
		});
	}

	async c(args: { value: number }) {
		return {
			a: args.value
		};
	}

	async d(input: number[]) {
		return input;
	}

	async $e(input: number[]) {
		return input;
	}
}

const inspectResponse = async (res: any[]) => {
	return Promise.all(
		res.map(async res => {
			if (res instanceof Response) {
				const json = res.headers.get('content-type')?.includes('application/json');
				const body = await util.readStream(res.body);

				return {
					body: json ? util.safeParse(body) : body,
					headers: headers.toJson(res.headers),
					ok: res.ok,
					status: res.status,
					type: 'response'
				};
			}

			return res;
		})
	);
};

describe('/rpc-proxy', () => {
	beforeAll(() => {
		HttpError.setIncludeStack(false);
	});

	afterAll(() => {
		HttpError.setIncludeStack(true);
	});

	describe('create', () => {
		let mock: Mock;
		let rpc: RpcProxy.Test.Caller<RpcSpec>;

		beforeEach(() => {
			mock = vi.fn();
			rpc = rpcProxy.createTestCaller(new RpcSpec(), { mock });
		});

		it('should call the handler with single request', async () => {
			const res = await rpc.a({ value: 123 });

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual({ a: 123 });
		});

		it('should call the handler with single request with array arguments', async () => {
			const res = await rpc.d([123, 456]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [[123, 456]],
					batch: false,
					resource: 'd',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual([123, 456]);
		});

		it('should call the handler with single request with asObject()', async () => {
			const res = await rpc.a.asObject({ value: 123 });

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'object'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual({
				body: { a: 123 },
				headers: {
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});
		});

		it('should call the handler with single request with asResponse()', async () => {
			const res = await rpc.a.asResponse({ value: 123 });

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'response'
				},
				url: 'http://localhost/rpc'
			});

			expect(await res.json()).toEqual({ a: 123 });
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should call the handler with single request and options', async () => {
			const controller = new AbortController();
			const res = await rpc.a(
				{
					value: 123
				},
				rpc.options({
					ephemeralCacheTtlSeconds: 0,
					headers: new Headers({
						'rpc-a': 'a'
					}),
					signal: controller.signal
				})
			);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-a': 'a'
				},
				options: new RpcProxyRequestOptions({
					ephemeralCacheTtlSeconds: 0,
					headers: new Headers({
						'rpc-a': 'a'
					}),
					signal: controller.signal
				}),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual({ a: 123 });
		});

		it('should call the handler with batch request', async () => {
			const res = await rpc.batch([
				rpc.a({
					value: 123
				}),
				rpc.a.asObject({
					value: 456
				}),
				rpc.a.asResponse({
					value: 789
				})
			]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'object' },
						{ args: [{ value: 789 }], batch: false, resource: 'a', responseType: 'response' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res[0]).toEqual({ a: 123 });
			expect(res[1]).toEqual({
				body: { a: 456 },
				headers: {
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			expect(await res[2].json()).toEqual({ a: 789 });
			expect(res[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should call the handler with batch request with array arguments', async () => {
			const res = await rpc.batch([rpc.d([123, 456]), rpc.d.asObject([789, 101112]), rpc.d.asResponse([131415, 161718])]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [[123, 456]], batch: false, resource: 'd', responseType: 'default' },
						{ args: [[789, 101112]], batch: false, resource: 'd', responseType: 'object' },
						{ args: [[131415, 161718]], batch: false, resource: 'd', responseType: 'response' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res[0]).toEqual([123, 456]);
			expect(res[1]).toEqual({
				body: [789, 101112],
				headers: {
					'content-type': 'application/json',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			expect(await res[2].json()).toEqual([131415, 161718]);
			expect(res[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should call the handler with batch request with asObject()', async () => {
			const res = await rpc.batch.asObject([
				rpc.a({
					value: 123
				}),
				rpc.a.asObject({
					value: 456
				}),
				rpc.a.asResponse({
					value: 789
				})
			]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'object' },
						{ args: [{ value: 789 }], batch: false, resource: 'a', responseType: 'response' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'object'
				},
				url: 'http://localhost/rpc'
			});

			expect(res.body[0]).toEqual({ a: 123 });
			expect(res.body[1]).toEqual({
				body: { a: 456 },
				headers: {
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});

			expect(await res.body[2].json()).toEqual({ a: 789 });
			expect(res.body[2].headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should call the handler with batch request with asResponse()', async () => {
			const res = await rpc.batch.asResponse([
				rpc.a({
					value: 123
				}),
				rpc.a.asObject({
					value: 456
				}),
				rpc.a.asResponse({
					value: 789
				})
			]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'object' },
						{ args: [{ value: 789 }], batch: false, resource: 'a', responseType: 'response' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'response'
				},
				url: 'http://localhost/rpc'
			});

			expect(await res.json()).toEqual([
				{ a: 123 },
				{
					body: { a: 456 },
					headers: {
						'content-type': 'application/json',
						'rpc-a': 'a',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				},
				{
					body: { a: 789 },
					headers: {
						'content-type': 'application/json',
						'rpc-a': 'a',
						'rpc-response-type': 'response'
					},
					ok: true,
					status: 200
				}
			]);

			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'rpc-response-batch': 'true',
					'rpc-response-type': 'response'
				})
			);
		});

		it('should call the handler with batch request and options', async () => {
			const controller = new AbortController();
			const res = await rpc.batch(
				[
					rpc.a(
						{
							value: 123
						},
						rpc.options({
							headers: new Headers({
								'rpc-a': '1',
								'rpc-b': '1'
							})
						})
					),
					rpc.a({
						value: 456
					}),
					rpc.a(
						{
							value: 789
						},
						rpc.options({
							headers: new Headers({
								'rpc-b': '2',
								'rpc-c': '2'
							})
						})
					)
				],
				rpc.options({
					ephemeralCacheTtlSeconds: 0.5,
					headers: new Headers({
						'rpc-request-batch': 'true',
						'rpc-c': 'batch'
					}),
					signal: controller.signal
				})
			);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true',
					'rpc-a': '1',
					'rpc-b': '2',
					'rpc-c': 'batch'
				},
				options: new RpcProxyRequestOptions({
					ephemeralCacheTtlSeconds: 0.5,
					headers: new Headers({
						'rpc-request-batch': 'true',
						'rpc-a': '1',
						'rpc-b': '2',
						'rpc-c': 'batch'
					}),
					signal: controller.signal
				}),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 789 }], batch: false, resource: 'a', responseType: 'default' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual([{ a: 123 }, { a: 456 }, { a: 789 }]);
		});

		it('should call the handler with batch request wrapped by promise.all', async () => {
			const res = await Promise.all([
				rpc.batch(
					[
						rpc.a({
							value: 123
						}),
						rpc.a({
							value: 456
						})
					],
					rpc.options({
						headers: new Headers({
							'edge-batch-1': 'true'
						})
					})
				),
				rpc.batch([
					rpc.b({
						value: 789
					}),
					rpc.b({
						value: 101112
					})
				]),
				rpc.batch(
					[
						rpc.b({
							value: 789
						}),
						rpc.b({
							value: 101112
						})
					],
					rpc.options({
						headers: new Headers({
							'edge-batch-2': 'true'
						})
					})
				),
				rpc.batch([
					rpc.a({
						value: 123
					}),
					rpc.a({
						value: 456
					})
				])
			]);

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'edge-batch-1': 'true',
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions({
					ephemeralCacheTtlSeconds: 1,
					headers: new Headers({
						'edge-batch-1': 'true'
					}),
					signal: null
				}),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'default' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'edge-batch-2': 'true',
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions({
					ephemeralCacheTtlSeconds: 1,
					headers: new Headers({
						'edge-batch-2': 'true'
					}),
					signal: null
				}),
				rpc: {
					args: [
						{ args: [{ value: 789 }], batch: false, resource: 'b', responseType: 'default' },
						{ args: [{ value: 101112 }], batch: false, resource: 'b', responseType: 'default' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [{ value: 789 }], batch: false, resource: 'b', responseType: 'default' },
						{ args: [{ value: 101112 }], batch: false, resource: 'b', responseType: 'default' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-request-batch': 'true'
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [
						{ args: [{ value: 123 }], batch: false, resource: 'a', responseType: 'default' },
						{ args: [{ value: 456 }], batch: false, resource: 'a', responseType: 'default' }
					],
					batch: true,
					resource: 'batch',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual([
				[{ a: 123 }, { a: 456 }],
				[{ a: 789 }, { a: 101112 }],
				[{ a: 789 }, { a: 101112 }],
				[{ a: 123 }, { a: 456 }]
			]);
		});

		it('should throw on nested batch calls', async () => {
			try {
				await rpc.batch([
					rpc.batch([
						rpc.a({
							value: 123
						})
					])
				]);
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Nested batch calls are not allowed',
					stack: [],
					status: 400
				});
			}
		});

		it('should throw on set options.body on batch calls', async () => {
			try {
				await rpc.batch([
					rpc.a(
						{ value: 123 },
						rpc.options({
							body: new Blob()
						})
					)
				]);
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Batch requests does not support body',
					stack: [],
					status: 400
				});
			}

			try {
				await rpc.batch(
					[rpc.a({ value: 123 })],
					rpc.options({
						body: new Blob()
					})
				);
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Batch requests does not support body',
					stack: [],
					status: 400
				});
			}
		});

		it('should ignore invalid keys and "then" key', async () => {
			try {
				// @ts-expect-error
				await rpc.then();
			} catch {
				// suppress
			} finally {
				expect(mock).not.toHaveBeenCalled();
			}
		});
	});

	describe('createRequest', () => {
		it('should create request', async () => {
			const rpc: Rpc.Request = {
				args: [{ value: 123 }],
				batch: false,
				resource: 'a',
				responseType: 'default'
			};

			const req = rpcProxy.createRequest(rpc);
			const form = await req.formData();

			expect(form.has('body')).toBeFalsy();
			expect(form.get('rpc')).toEqual(JSON.stringify(rpc));
			expect(req.cf).toEqual({});
			expect(req.url).toEqual('http://localhost/rpc');
			expect(req.method).toEqual('POST');
			expect(req.headers.get('content-type')).toContain('multipart/form-data');
			expect(req.headers).toEqual(
				new Headers({
					'content-type': req.headers.get('content-type') || ''
				})
			);
		});

		it('should create request with options', async () => {
			const rpc: Rpc.Request = {
				args: [{ value: 123 }],
				batch: false,
				resource: 'a',
				responseType: 'default'
			};

			const controller = new AbortController();
			const req = rpcProxy.createRequest(rpc, {
				body: new Blob(),
				cf: { country: 'US' },
				headers: new Headers({
					'content-type': 'text/plain', // must be overriden
					'rpc-1': 'true',
					'rpc-2': 'true'
				}),
				origin: 'http://test',
				pathname: '/test-rpc',
				signal: controller.signal
			});

			const form = await req.formData();

			expect(form.has('body')).toBeTruthy();
			expect(form.get('rpc')).toEqual(JSON.stringify(rpc));
			expect(req.cf).toEqual({ country: 'US' });
			expect(req.url).toEqual('http://test/test-rpc');
			expect(req.method).toEqual('POST');
			expect(req.headers.get('content-type')).toContain('multipart/form-data');
			expect(req.headers).toEqual(
				new Headers({
					'content-type': req.headers.get('content-type') || '',
					'rpc-1': 'true',
					'rpc-2': 'true'
				})
			);
		});

		it('should throw on set options.body on batch calls', async () => {
			const rpc: Rpc.Request = {
				args: [],
				batch: true,
				resource: 'a',
				responseType: 'default'
			};

			try {
				rpcProxy.createRequest(
					rpc,
					new RpcProxyRequestOptions({
						body: new Blob()
					})
				);

				throw new Error('Expected to throw');
			} catch {
				// suppress
			}
		});
	});

	describe('createResponse', () => {
		let res: RpcResponse;

		beforeEach(() => {
			res = new RpcResponse({ a: 1 });
		});

		describe('single', () => {
			it('should works', async () => {
				expect(await rpcProxy.createResponse(res)).toEqual({ a: 1 });
			});

			it('should works with boolean', async () => {
				expect(await rpcProxy.createResponse(new RpcResponse(false))).toBeFalsy();
			});

			it('should works with error', async () => {
				expect(await rpcProxy.createResponse(HttpError.response(404))).toEqual({
					context: {},
					message: 'Not Found',
					stack: [],
					status: 404
				});
			});

			it('should works with null', async () => {
				expect(await rpcProxy.createResponse(new RpcResponse(null))).toBeNull();
			});

			it('should works with number', async () => {
				expect(await rpcProxy.createResponse(new RpcResponse(15))).toEqual(15);
			});

			it('should works with empty string', async () => {
				expect(await rpcProxy.createResponse(new RpcResponse(''))).toEqual('');
			});

			it('should works as object', async () => {
				res = new RpcResponse(
					{ a: 1 },
					{
						headers: new Headers({ 'rpc-response-type': 'object' })
					}
				);

				expect(await rpcProxy.createResponse(res)).toEqual({
					body: { a: 1 },
					headers: {
						'content-type': 'application/json',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with boolean', async () => {
				res = new RpcResponse(false, {
					headers: new Headers({ 'rpc-response-type': 'object' })
				});

				expect(await rpcProxy.createResponse(res)).toEqual({
					body: false,
					headers: {
						'content-type': 'application/json',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with null', async () => {
				res = new RpcResponse(null, {
					headers: new Headers({ 'rpc-response-type': 'object' })
				});

				expect(await rpcProxy.createResponse(res)).toEqual({
					body: null,
					headers: {
						'content-type': 'application/json',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with number', async () => {
				res = new RpcResponse(15, {
					headers: new Headers({ 'rpc-response-type': 'object' })
				});

				expect(await rpcProxy.createResponse(res)).toEqual({
					body: 15,
					headers: {
						'content-type': 'application/json',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with empty string', async () => {
				res = new RpcResponse('', {
					headers: new Headers({ 'rpc-response-type': 'object' })
				});

				expect(await rpcProxy.createResponse(res)).toEqual({
					body: '',
					headers: {
						'content-type': 'text/plain;charset=UTF-8',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as response', async () => {
				res = new RpcResponse(
					{ a: 1 },
					{
						headers: new Headers({ 'rpc-response-type': 'response' })
					}
				);

				expect(await rpcProxy.createResponse(res)).toBe(res);
			});

			it('should works as response with boolean', async () => {
				res = new RpcResponse(false, {
					headers: new Headers({ 'rpc-response-type': 'response' })
				});

				expect(await rpcProxy.createResponse(res)).toBe(res);
			});

			it('should works as response with null', async () => {
				res = new RpcResponse(null, {
					headers: new Headers({ 'rpc-response-type': 'response' })
				});

				expect(await rpcProxy.createResponse(res)).toBe(res);
			});

			it('should works as response with number', async () => {
				res = new RpcResponse(15, {
					headers: new Headers({ 'rpc-response-type': 'response' })
				});

				expect(await rpcProxy.createResponse(res)).toBe(res);
			});

			it('should works as response with empty string', async () => {
				res = new RpcResponse('', {
					headers: new Headers({ 'rpc-response-type': 'response' })
				});

				expect(await rpcProxy.createResponse(res)).toBe(res);
			});
		});

		describe('batch', () => {
			it('should works', async () => {
				const input = [
					{
						body: { a: 1 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: { a: 2 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: { a: 3 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					{ a: 1 },
					{
						body: { a: 2 },
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: { a: 3 },
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200,
						type: 'response'
					}
				]);
			});

			it('should works with boolean', async () => {
				const input = [
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					false,
					{
						body: false,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: false,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200,
						type: 'response'
					}
				]);
			});

			it('should works with error', async () => {
				const input = [
					{
						body: {
							context: {},
							message: 'Not Found',
							stack: [],
							status: 404
						},
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: false,
						responseType: 'default',
						status: 404
					},
					{
						body: {
							context: {},
							message: 'Not Found',
							stack: [],
							status: 404
						},
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: false,
						responseType: 'object',
						status: 404
					},
					{
						body: {
							context: {},
							message: 'Not Found',
							stack: [],
							status: 404
						},
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: false,
						responseType: 'response',
						status: 404
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					null,
					{
						body: {
							context: {},
							message: 'Not Found',
							stack: [],
							status: 404
						},
						headers: {
							'content-type': 'application/json'
						},
						ok: false,
						status: 404
					},
					{
						body: {
							context: {},
							message: 'Not Found',
							stack: [],
							status: 404
						},
						headers: {
							'content-type': 'application/json'
						},
						ok: false,
						status: 404,
						type: 'response'
					}
				]);
			});

			it('should works with null', async () => {
				const input = [
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					null,
					{
						body: null,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: null,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200,
						type: 'response'
					}
				]);
			});

			it('should works with number', async () => {
				const input = [
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					15,
					{
						body: 15,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: 15,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200,
						type: 'response'
					}
				]);
			});

			it('should works with empty string', async () => {
				const input = [
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({ 'rpc-response-batch': 'true' })
				});

				expect(await inspectResponse(await rpcProxy.createResponse(res))).toEqual([
					'',
					{
						body: '',
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: '',
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200,
						type: 'response'
					}
				]);
			});

			it('should works as object', async () => {
				const input = [
					{
						body: { a: 1 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: { a: 2 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: { a: 3 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					})
				});

				const object = (await rpcProxy.createResponse<{
					body: any;
					headers: Record<string, string>;
					ok: boolean;
					status: number;
				}>(res)) as Rpc.ResponseObject<any>;

				expect({
					...object,
					body: await inspectResponse(object.body)
				}).toEqual({
					body: [
						{ a: 1 },
						{
							body: { a: 2 },
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200
						},
						{
							body: { a: 3 },
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200,
							type: 'response'
						}
					],
					headers: {
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with boolean', async () => {
				const input = [
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					})
				});

				const object = (await rpcProxy.createResponse<{
					body: any;
					headers: Record<string, string>;
					ok: boolean;
					status: number;
				}>(res)) as Rpc.ResponseObject<any>;

				expect({
					...object,
					body: await inspectResponse(object.body)
				}).toEqual({
					body: [
						false,
						{
							body: false,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200
						},
						{
							body: false,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200,
							type: 'response'
						}
					],
					headers: {
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with null', async () => {
				const input = [
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					})
				});

				const object = (await rpcProxy.createResponse<{
					body: any;
					headers: Record<string, string>;
					ok: boolean;
					status: number;
				}>(res)) as Rpc.ResponseObject<any>;

				expect({
					...object,
					body: await inspectResponse(object.body)
				}).toEqual({
					body: [
						null,
						{
							body: null,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200
						},
						{
							body: null,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200,
							type: 'response'
						}
					],
					headers: {
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with number', async () => {
				const input = [
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					})
				});

				const object = (await rpcProxy.createResponse<{
					body: any;
					headers: Record<string, string>;
					ok: boolean;
					status: number;
				}>(res)) as Rpc.ResponseObject<any>;

				expect({
					...object,
					body: await inspectResponse(object.body)
				}).toEqual({
					body: [
						15,
						{
							body: 15,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200
						},
						{
							body: 15,
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200,
							type: 'response'
						}
					],
					headers: {
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as object with empty string', async () => {
				const input = [
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					})
				});

				const object = (await rpcProxy.createResponse<{
					body: any;
					headers: Record<string, string>;
					ok: boolean;
					status: number;
				}>(res)) as Rpc.ResponseObject<any>;

				expect({
					...object,
					body: await inspectResponse(object.body)
				}).toEqual({
					body: [
						'',
						{
							body: '',
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200
						},
						{
							body: '',
							headers: {
								'content-type': 'application/json'
							},
							ok: true,
							status: 200,
							type: 'response'
						}
					],
					headers: {
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'object'
					},
					ok: true,
					status: 200
				});
			});

			it('should works as response', async () => {
				const input = [
					{
						body: { a: 1 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: { a: 2 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: { a: 3 },
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				});

				const body = (await rpcProxy.createResponse(res)) as Response;

				expect(await body.json()).toEqual([
					{ a: 1 },
					{
						body: { a: 2 },
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: { a: 3 },
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					}
				]);

				expect(body.headers).toEqual(
					new Headers({
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				);
			});

			it('should works as response with boolean', async () => {
				const input = [
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: false,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				});

				const body = (await rpcProxy.createResponse(res)) as Response;

				expect(await body.json()).toEqual([
					false,
					{
						body: false,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: false,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					}
				]);

				expect(body.headers).toEqual(
					new Headers({
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				);
			});

			it('should works as response with null', async () => {
				const input = [
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: null,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				});

				const body = (await rpcProxy.createResponse(res)) as Response;

				expect(await body.json()).toEqual([
					null,
					{
						body: null,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: null,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					}
				]);

				expect(body.headers).toEqual(
					new Headers({
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				);
			});

			it('should works as response with number', async () => {
				const input = [
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: 15,
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				});

				const body = (await rpcProxy.createResponse(res)) as Response;

				expect(await body.json()).toEqual([
					15,
					{
						body: 15,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: 15,
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					}
				]);

				expect(body.headers).toEqual(
					new Headers({
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				);
			});

			it('should works as response with empty string', async () => {
				const input = [
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'default',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'object',
						status: 200
					},
					{
						body: '',
						contentType: 'application/json',
						headers: { 'content-type': 'application/json' },
						ok: true,
						responseType: 'response',
						status: 200
					}
				];

				res = new RpcResponse(input, {
					headers: new Headers({
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				});

				const body = (await rpcProxy.createResponse(res)) as Response;

				expect(await body.json()).toEqual([
					'',
					{
						body: '',
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					},
					{
						body: '',
						headers: {
							'content-type': 'application/json'
						},
						ok: true,
						status: 200
					}
				]);

				expect(body.headers).toEqual(
					new Headers({
						'content-type': 'application/json',
						'rpc-response-batch': 'true',
						'rpc-response-type': 'response'
					})
				);
			});
		});
	});

	describe('createTestCaller', () => {
		let mock: Mock;
		let rpc: RpcProxy.Test.Caller<RpcSpec>;

		beforeEach(() => {
			mock = vi.fn();
		});

		it('should works', async () => {
			rpc = rpcProxy.createTestCaller(new RpcSpec(), { mock });

			const res = await rpc.a({ value: 123 });

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual({ a: 123 });
		});

		it('should works with private method', async () => {
			rpc = rpcProxy.createTestCaller(new RpcSpec(), { mock });

			// @ts-expect-error
			const res = await rpc.$e('private');

			expect(mock).toHaveBeenCalledWith({
				cf: {},
				headers: {
					'content-type': expect.stringContaining('multipart/form-data')
				},
				options: new RpcProxyRequestOptions(),
				rpc: {
					args: ['private'],
					batch: false,
					resource: '$e',
					responseType: 'default'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual('private');
		});

		it('should works with options', async () => {
			rpc = rpcProxy.createTestCaller(new RpcSpec(), {
				cf: { country: 'US' },
				headers: new Headers({ 'edge-test-caller': 'true' }),
				mock
			});

			const controller = new AbortController();
			const res = await rpc.a.asObject(
				{ value: 123 },
				rpc.options({
					ephemeralCacheTtlSeconds: 0.5,
					headers: new Headers({ 'rpc-a': 'a' }),
					signal: controller.signal
				})
			);

			expect(mock).toHaveBeenCalledWith({
				cf: { country: 'US' },
				headers: {
					'content-type': expect.stringContaining('multipart/form-data'),
					'rpc-a': 'a',
					'edge-test-caller': 'true'
				},
				options: new RpcProxyRequestOptions({
					ephemeralCacheTtlSeconds: 0.5,
					headers: new Headers({
						'rpc-a': 'a'
					}),
					signal: controller.signal
				}),
				rpc: {
					args: [{ value: 123 }],
					batch: false,
					resource: 'a',
					responseType: 'object'
				},
				url: 'http://localhost/rpc'
			});

			expect(res).toEqual({
				body: { a: 123 },
				headers: {
					'content-type': 'application/json',
					'rpc-a': 'a',
					'rpc-response-type': 'object'
				},
				ok: true,
				status: 200
			});
		});
	});

	describe('payloadToRequest', () => {
		it('should convert single payload to request', () => {
			const payload: RpcProxy.Payload = {
				args: [{ value: 123 }],
				batch: false,
				resource: 'resource.a.b',
				responseType: 'default'
			};

			const req = rpcProxy.payloadToRequest(payload);

			expect(req).toEqual({
				args: [{ value: 123 }],
				batch: false,
				resource: 'resource.a.b',
				responseType: 'default'
			});
		});

		it('should convert batch payload to request', () => {
			const payload: RpcProxy.Payload = {
				args: [
					{
						args: [{ value: 123 }],
						batch: false,
						resource: 'resource.a.b',
						responseType: 'default'
					},
					{
						args: [{ value: 456 }],
						batch: false,
						resource: 'resource.a.c',
						responseType: 'object'
					},
					{
						args: [{ value: 789 }],
						batch: false,
						resource: 'resource.a.d',
						responseType: 'response'
					},
					{
						args: '[invalid]' as any,
						batch: false,
						resource: 'invalid',
						responseType: 'response'
					}
				],
				batch: true,
				resource: '',
				responseType: 'default'
			};

			const req = rpcProxy.payloadToRequest(payload);

			expect(req).toEqual({
				args: [
					{
						args: [{ value: 123 }],
						batch: false,
						resource: 'resource.a.b',
						responseType: 'default'
					},
					{
						args: [{ value: 456 }],
						batch: false,
						resource: 'resource.a.c',
						responseType: 'object'
					},
					{
						args: [{ value: 789 }],
						batch: false,
						resource: 'resource.a.d',
						responseType: 'response'
					},
					{
						args: [],
						batch: false,
						resource: '',
						responseType: 'default'
					}
				],
				batch: true,
				resource: '',
				responseType: 'default'
			});
		});
	});

	describe('throwError', () => {
		it('should throw', async () => {
			try {
				await rpcProxy.throwError(
					new Response('error', {
						status: 500
					})
				);

				throw new Error('Expected to throw');
			} catch (err) {
				console.log(err);
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'error',
					stack: [],
					status: 500
				});
			}
		});

		it('should throw HttpError', async () => {
			try {
				await rpcProxy.throwError(HttpError.response(400));

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: {},
					message: 'Bad Request',
					stack: [],
					status: 400
				});
			}
		});

		it('should do nothing if response.ok', async () => {
			const res = await rpcProxy.throwError(
				new Response('ok', {
					status: 200
				})
			);

			expect(res).toBeNull();
		});

		it('should do nothing if rpc-response-type = "object"', async () => {
			const res = await rpcProxy.throwError(
				new Response('error', {
					headers: { 'rpc-response-type': 'object' },
					status: 500
				})
			);

			expect(res).toBeNull();
		});

		it('should do nothing if rpc-response-type = "response"', async () => {
			const res = await rpcProxy.throwError(
				new Response('error', {
					headers: { 'rpc-response-type': 'response' },
					status: 500
				})
			);

			expect(res).toBeNull();
		});
	});

	describe('RpcProxyRequestOptions', () => {
		it('should works empty', () => {
			const options = new RpcProxyRequestOptions();

			expect(options).toEqual({
				body: null,
				ephemeralCacheTtlSeconds: 1,
				headers: new Headers(),
				signal: null
			});

			expect(options.toJson()).toEqual({
				body: false,
				ephemeralCacheTtlSeconds: 1,
				headers: {},
				signal: null
			});
		});

		it('should works', () => {
			const controller = new AbortController();
			const headers = new Headers({
				'edge-a': 'a'
			});

			const options = new RpcProxyRequestOptions({
				body: new Blob(),
				ephemeralCacheTtlSeconds: 0,
				headers,
				signal: controller.signal
			});

			expect(options.toJson()).toEqual({
				body: true,
				ephemeralCacheTtlSeconds: 0,
				headers: { 'edge-a': 'a' },
				signal: controller.signal
			});
		});
	});
});
