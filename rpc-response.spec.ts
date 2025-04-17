import { describe, it, expect } from 'vitest';

import RpcResponse from './rpc-response';

describe('/RpcResponse', () => {
	let res: RpcResponse;

	describe('constructor', () => {
		it('should works', async () => {
			res = new RpcResponse();

			expect(res.cache).toBeFalsy();
			expect(res.body).toBeNull();
			expect(res.headers).toEqual(new Headers());
		});

		it('should works with array', async () => {
			res = new RpcResponse([]);

			expect(res.cache).toBeFalsy();
			expect(await res.json()).toEqual([]);
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/json' }));
		});

		it('should works with boolean', async () => {
			res = new RpcResponse(false);

			expect(res.cache).toBeFalsy();
			expect(await res.json()).toBeFalsy();
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/json' }));
		});

		it('should works with plain object', async () => {
			res = new RpcResponse({ a: 1 });

			expect(res.cache).toBeFalsy();
			expect(await res.json()).toEqual({ a: 1 });
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/json' }));
		});

		it('should works with number', async () => {
			res = new RpcResponse(15);

			expect(res.cache).toBeFalsy();
			expect(await res.json()).toEqual(15);
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/json' }));
		});

		it('should works with stream', () => {
			res = new RpcResponse(new ReadableStream());

			expect(res.cache).toBeFalsy();
			expect(res.headers).toEqual(new Headers({ 'content-type': 'application/octet-stream' }));
		});

		it('should works with string', async () => {
			res = new RpcResponse('string');

			expect(res.cache).toBeFalsy();
			expect(await res.text()).toEqual('string');
			expect(res.headers).toEqual(new Headers({ 'content-type': 'text/plain;charset=UTF-8' }));
		});

		it('should works with init', () => {
			res = new RpcResponse('string', {
				cache: true,
				headers: new Headers({ 'edge-rpc-string': 'string' })
			});

			expect(res.cache).toBeTruthy();
			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'text/plain;charset=UTF-8',
					'edge-rpc-string': 'string'
				})
			);
		});
	});

	describe('addDefaultHeaders', () => {
		it('should works', () => {
			res = new RpcResponse({ a: 1 });

			res.addDefaultHeaders(
				new Headers({
					'content-type': 'CANT BE CHANGED',
					'edge-header': 'true'
				})
			);

			expect(res.headers).toEqual(
				new Headers({
					'content-type': 'application/json',
					'edge-header': 'true'
				})
			);
		});
	});

	describe('json', () => {
		it('should works', async () => {
			res = new RpcResponse({ a: 1 });

			expect(await res.json()).toEqual({ a: 1 });
		});
	});
});
