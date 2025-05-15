import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import HttpError from 'use-http-error';
import JSON from 'use-json';

import Request from './request';
import Rpc from './rpc';
import useRpc from './use-rpc';
import util from './util';

class TestRpc extends Rpc {
	async error() {
		throw new Error('Error');
	}

	async success(...args: any[]) {
		return { a: 1, args };
	}
}

describe('/use-rpc', () => {
	beforeEach(() => {
		vi.spyOn(global, 'fetch').mockImplementation(async req => {
			if (req instanceof Request) {
				const form = await req.formData();
				const rpc = new TestRpc();
				const rpcRequest = JSON.parse<Rpc.Request>(form.get('rpc') as string);

				return rpc.fetch(rpcRequest, req);
			}

			return {
				json: async () => {
					return {};
				}
			} as Response;
		});
	});

	it('should works', async () => {
		const { result } = renderHook(() => {
			return useRpc<TestRpc>();
		});

		const res = await result.current.success('test1', 'test2');

		expect(res).toEqual({ a: 1, args: ['test1', 'test2'] });
	});

	it('should works with error', async () => {
		try {
			const { result } = renderHook(() => {
				return useRpc<TestRpc>();
			});

			await result.current.error();

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as HttpError).toJson()).toEqual({
				context: {
					rpc: {
						args: [],
						batch: false,
						resource: 'error',
						responseType: 'default'
					}
				},
				message: 'Error',
				stack: expect.any(Array),
				status: 500
			});
		}
	});
});
