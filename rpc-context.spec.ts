import { describe, it, expect, beforeEach } from 'vitest';

import RpcContext from './rpc-context';

describe('/rpc-context', () => {
	let request: RpcContext;

	beforeEach(() => {
		request = new RpcContext({
			body: null,
			cf: {},
			headers: new Headers(),
			url: new URL('https://localhost')
		});
	});

	describe('constructor', () => {
		it('should works', () => {
			expect(request.body).toBeNull();
			expect(request.cf).toEqual({});
			expect(request.headers).toEqual(new Headers());
			expect(request.defaultResponseMeta).toEqual({
				headers: new Headers(),
				status: 0
			});
		});

		it('should works with body', () => {
			request = new RpcContext({
				body: new ReadableStream(),
				cf: {},
				headers: new Headers(),
				url: new URL('https://localhost')
			});

			expect(request.body).toBeInstanceOf(ReadableStream);
		});
	});

	describe('get / set', () => {
		it('should works', () => {
			request.set('a', 1);

			expect(request.get('a')).toEqual(1);
		});
	});

	describe('setDefaultResponseHeaders / setDefaultResponseStatus', () => {
		it('should works', () => {
			request.setDefaultResponseHeaders(
				new Headers({
					'edge-header': 'true'
				})
			);
			request.setDefaultResponseStatus(201);

			expect(request.defaultResponseMeta).toEqual({
				headers: new Headers({ 'edge-header': 'true' }),
				status: 201
			});
		});
	});

	describe('toJson', () => {
		it('should works', () => {
			request.set('a', 1);

			expect(request.toJson()).toEqual({
				cf: {},
				data: { a: 1 },
				headers: {},
				url: 'https://localhost/'
			});
		});
	});
});
