import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import HttpError from 'use-http-error';

import AuthBasic from './auth-basic';

describe('/auth-basic', () => {
	let username = 'testuser';
	let password = 'testpass';
	let auth: AuthBasic;

	beforeAll(() => {
		HttpError.setIncludeStack(false);
	});

	beforeEach(() => {
		auth = new AuthBasic({
			username,
			password
		});
	});

	describe('authenticate', () => {
		it('should works', async () => {
			const headers = new Headers({
				authorization: `Basic ${btoa(`${username}:${password}`)}`
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
			auth = new AuthBasic({
				header: 'custom',
				username,
				password
			});

			const headers = new Headers({
				custom: `Basic ${btoa(`${username}:${password}`)}`
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
					context: { auth: 'Basic error="inexistent_token"' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			}
		});

		it('should throw if invalid scheme', async () => {
			const headers = new Headers({
				authorization: 'Bearer token'
			});

			try {
				await auth.authenticate(headers);

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: { auth: 'Basic error="invalid_scheme"' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			}
		});

		it('should throw if invalid credentials', async () => {
			const headers = new Headers({
				authorization: `Basic ${btoa('invalid:credentials')}`
			});

			try {
				await auth.authenticate(headers);

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: { auth: 'Basic error="invalid_credentials"' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			}
		});
	});
});
