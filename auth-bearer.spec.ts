import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import HttpError from 'use-http-error';

import AuthBearer from './auth-bearer';

describe('/auth-bearer', () => {
	let auth: AuthBearer;

	beforeAll(() => {
		HttpError.setIncludeStack(false);
	});

	describe('authenticate', () => {
		it('should throw if no token in options', async () => {
			try {
				new AuthBearer({
					token: ''
				});

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('Bearer auth requires options for "token"');
			}
		});

		describe('single token', () => {
			beforeEach(() => {
				auth = new AuthBearer({
					token: 'token'
				});
			});

			it('should works', async () => {
				const headers = new Headers({
					authorization: `Bearer token`
				});

				let error: Error | null = null;

				try {
					await auth.authenticate(headers);
				} catch (err) {
					error = err as Error;
				} finally {
					expect(error).toBeNull();
				}
			});

			it('should works with custom header', async () => {
				auth = new AuthBearer({
					header: 'custom',
					token: 'token'
				});

				const headers = new Headers({
					custom: `Bearer token`
				});

				let error: Error | null = null;

				try {
					await auth.authenticate(headers);
				} catch (err) {
					error = err as Error;
				} finally {
					expect(error).toBeNull();
				}
			});

			it('should throw if no header', async () => {
				try {
					await auth.authenticate(new Headers());

					throw new Error('Expected to throw');
				} catch (err) {
					expect((err as HttpError).toJson()).toEqual({
						context: { auth: 'Bearer error="inexistent_token"' },
						message: 'Unauthorized',
						stack: [],
						status: 401
					});
				}
			});

			it('should throw if invalid credentials', async () => {
				const headers = new Headers({
					authorization: `Bearer invalid`
				});

				try {
					await auth.authenticate(headers);

					throw new Error('Expected to throw');
				} catch (err) {
					expect((err as HttpError).toJson()).toEqual({
						context: { auth: 'Bearer error="invalid_token"' },
						message: 'Unauthorized',
						stack: [],
						status: 401
					});
				}
			});
		});

		describe('multi token', () => {
			beforeEach(() => {
				auth = new AuthBearer({
					token: ['token1', 'token2']
				});
			});

			it('should works', async () => {
				const headers = new Headers({
					authorization: `Bearer token1`
				});

				let error: Error | null = null;

				try {
					await auth.authenticate(headers);
				} catch (err) {
					error = err as Error;
				} finally {
					expect(error).toBeNull();
				}
			});
		});

		describe('custom token function', () => {
			beforeEach(() => {
				auth = new AuthBearer({
					token: async (token: string) => {
						return token === 'token1';
					}
				});
			});

			it('should works', async () => {
				const headers = new Headers({
					authorization: `Bearer token1`
				});

				let error: Error | null = null;

				try {
					await auth.authenticate(headers);
				} catch (err) {
					error = err as Error;
				} finally {
					expect(error).toBeNull();
				}
			});
		});
	});
});
