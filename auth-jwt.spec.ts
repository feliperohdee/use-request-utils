import _ from 'lodash';
import { afterEach, beforeEach, describe, it, expect, vi, beforeAll } from 'vitest';
import HttpError from 'use-http-error';

import AuthJwt from './auth-jwt';
import cookies from './cookies';
import jwt from './jwt';

describe('/authJwt', () => {
	let auth: AuthJwt;

	describe('authenticate', () => {
		beforeAll(() => {
			HttpError.setIncludeStack(false);
		});

		beforeEach(() => {
			auth = new AuthJwt({
				secret: 'secret'
			});
		});

		it('should works', async () => {
			const token = await jwt.sign(
				{
					foo: 'bar'
				},
				'secret'
			);

			const headers = new Headers({
				authorization: `Bearer ${token}`
			});

			const res = await auth.authenticate(headers);

			expect(res.payload.foo).toEqual('bar');
			expect(res.headers).toBeInstanceOf(Headers);
		});

		it('should works with string', async () => {
			const token = await jwt.sign(
				{
					foo: 'bar'
				},
				'secret'
			);

			const res = await auth.authenticate(token);

			expect(res.payload.foo).toEqual('bar');
			expect(res.headers).toBeInstanceOf(Headers);
		});

		it('should throw if no secret in options', async () => {
			try {
				new AuthJwt({
					secret: ''
				});

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('JWT auth requires options for "secret"');
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
				authorization: 'Bearer'
			});

			try {
				await auth.authenticate(headers);

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as HttpError).toJson()).toEqual({
					context: { auth: 'Bearer error="invalid_credentials"' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			}
		});

		describe('encrypted', () => {
			beforeEach(() => {
				auth = new AuthJwt({
					encrypt: true,
					secret: 'secret'
				});
			});

			it('should works', async () => {
				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'secret',
					{
						encrypt: true
					}
				);

				const headers = new Headers({
					authorization: `Bearer ${token}`
				});

				const res = await auth.authenticate(headers);

				expect(res.payload.foo).toEqual('bar');
				expect(res.headers).toBeInstanceOf(Headers);
			});

			it('should throw if invalid secret', async () => {
				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'wrong-secret',
					{
						encrypt: true
					}
				);

				const headers = new Headers({
					authorization: `Bearer ${token}`
				});

				try {
					await auth.authenticate(headers);

					throw new Error('Expected to throw');
				} catch (err) {
					expect((err as HttpError).toJson()).toEqual({
						context: {
							auth: 'Bearer error="The operation failed for an operation-specific reason"'
						},
						message: 'Unauthorized',
						stack: [],
						status: 401
					});
				}
			});
		});

		describe('cookie', () => {
			beforeEach(() => {
				auth = new AuthJwt({
					cookie: 'token',
					secret: 'secret'
				});
			});

			it('should works', async () => {
				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'secret'
				);

				const headers = cookies.set(new Headers(), 'token', token);
				const res = await auth.authenticate(headers);

				expect(res.payload.foo).toEqual('bar');
				expect(res.headers).toBeInstanceOf(Headers);
			});

			it('should works with signed cookie', async () => {
				auth = new AuthJwt({
					cookie: {
						name: 'token',
						secret: 'cookie-secret'
					},
					secret: 'secret'
				});

				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'secret'
				);

				const headers = await cookies.setSigned(new Headers(), 'token', token, 'cookie-secret');
				const res = await auth.authenticate(headers);

				expect(res.payload.foo).toEqual('bar');
				expect(res.headers).toBeInstanceOf(Headers);
			});

			it('should works with prefix', async () => {
				auth = new AuthJwt({
					cookie: {
						name: 'token',
						options: {
							prefix: 'secure'
						}
					},
					secret: 'secret'
				});

				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'secret'
				);

				const headers = cookies.set(new Headers(), 'token', token, {
					prefix: 'secure'
				});

				const res = await auth.authenticate(headers);
				expect(res.payload.foo).toEqual('bar');
				expect(res.headers).toBeInstanceOf(Headers);
			});

			it('should throw if no cookie', async () => {
				try {
					await auth.authenticate(new Headers());

					throw new Error('Expected to throw');
				} catch (err) {
					expect((err as HttpError).toJson()).toEqual({
						context: { auth: 'Cookie error="inexistent_token"' },
						message: 'Unauthorized',
						stack: [],
						status: 401
					});
				}
			});
		});

		describe('cookie encrypted', () => {
			beforeEach(() => {
				auth = new AuthJwt({
					cookie: 'token',
					encrypt: true,
					secret: 'secret'
				});
			});

			it('should works', async () => {
				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'secret',
					{
						encrypt: true
					}
				);

				const headers = cookies.set(new Headers(), 'token', token);
				const res = await auth.authenticate(headers);

				expect(res.payload.foo).toEqual('bar');
				expect(res.headers).toBeInstanceOf(Headers);
			});

			it('should throw if invalid secret', async () => {
				const token = await jwt.sign(
					{
						foo: 'bar'
					},
					'wrong-secret',
					{
						encrypt: true
					}
				);

				const headers = cookies.set(new Headers(), 'token', token);

				try {
					await auth.authenticate(headers);

					throw new Error('Expected to throw');
				} catch (err) {
					expect((err as HttpError).toJson()).toEqual({
						context: {
							auth: 'Bearer error="The operation failed for an operation-specific reason"'
						},
						message: 'Unauthorized',
						stack: [],
						status: 401
					});
				}
			});
		});

		describe('revalidate', () => {
			beforeEach(() => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should revalidate without expires', async () => {
				const thirtyMinutesInSeconds = 1800;
				const { headers, payload } = await auth.sign<any>({ foo: 'bar' });

				vi.advanceTimersByTime(thirtyMinutesInSeconds * 1000);

				const { headers: headers2, payload: payload2 } = await auth.authenticate<any>(headers, true);

				expect(payload!.foo).toEqual('bar');
				expect(payload2!.foo).toEqual('bar');
				expect(payload!.exp).toBeUndefined();
				expect(payload2!.exp).toBeUndefined();
				expect(headers.get('authorization')).not.toEqual(headers2.get('authorization'));
			});

			it('should revalidate', async () => {
				auth = new AuthJwt({
					expires: { hours: 1 },
					secret: 'secret'
				});

				const thirtyMinutesInSeconds = 1800;
				const { headers, payload } = await auth.sign<any>({ foo: 'bar' });

				vi.advanceTimersByTime(thirtyMinutesInSeconds * 1000);

				const { headers: headers2, payload: payload2 } = await auth.authenticate<any>(headers, true);

				expect(payload!.foo).toEqual('bar');
				expect(payload2!.foo).toEqual('bar');
				expect(payload2!.exp - payload!.exp).toEqual(thirtyMinutesInSeconds);
				expect(headers.get('authorization')).not.toEqual(headers2.get('authorization'));
			});

			it('should not revalidate', async () => {
				auth = new AuthJwt({
					expires: { hours: 1 },
					secret: 'secret'
				});

				const thirtyMinutesInSeconds = 1800;
				const { headers, payload } = await auth.sign<any>({ foo: 'bar' });

				vi.advanceTimersByTime(thirtyMinutesInSeconds * 1000);

				const { headers: headers2, payload: payload2 } = await auth.authenticate<any>(headers);

				expect(payload!.foo).toEqual('bar');
				expect(payload2!.foo).toEqual('bar');
				expect(payload2!.exp - payload!.exp).toEqual(0);
				expect(headers2.get('authorization')).toBeNull();
			});
		});
	});

	describe('destroy', () => {
		beforeEach(() => {
			auth = new AuthJwt({
				secret: 'secret'
			});
		});

		it('should works', async () => {
			const { headers, payload } = await auth.destroy();

			expect(headers.entries.length).toEqual(0);
			expect(payload).toBeNull();
		});

		it('should works with cookie', async () => {
			auth = new AuthJwt({
				cookie: 'token',
				secret: 'secret'
			});

			const { headers, payload } = await auth.destroy();

			expect(headers.get('set-cookie')).toEqual('token=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
			expect(payload).toBeNull();
		});
	});

	describe('sign', () => {
		describe('bearer', () => {
			beforeEach(() => {
				auth = new AuthJwt({
					secret: 'secret'
				});
			});

			it('should works', async () => {
				const { headers, payload, token } = await auth.sign({ a: 1 });
				expect(headers.has('authorization')).toBeTruthy();
				expect(payload).toEqual({
					a: 1,
					iat: payload?.iat
				});
				expect(token).toBeTypeOf('string');

				const { payload: payload2 } = await auth.authenticate(headers);
				expect(payload2).toEqual({
					a: 1,
					iat: payload2.iat
				});
			});

			it('should works with custom header', async () => {
				auth = new AuthJwt({
					header: 'custom',
					secret: 'secret'
				});

				const { headers, payload, token } = await auth.sign({ a: 1 });
				expect(headers.has('custom')).toBeTruthy();
				expect(payload).toEqual({
					a: 1,
					iat: payload?.iat
				});
				expect(token).toBeTypeOf('string');

				const { payload: payload2 } = await auth.authenticate(headers);
				expect(payload2).toEqual({
					a: 1,
					iat: payload2.iat
				});
			});

			it('should works with revalidateExpires = true', async () => {
				const now = new Date();
				const { headers, payload, token } = await auth.sign({ a: 1 }, now);
				expect(headers.has('authorization')).toBeTruthy();
				expect(payload).toEqual({
					a: 1,
					exp: _.floor(now.getTime() / 1000),
					iat: payload?.iat
				});
				expect(token).toBeTypeOf('string');

				const { payload: payload2 } = await auth.authenticate(headers);
				expect(payload2).toEqual({
					a: 1,
					exp: _.floor(now.getTime() / 1000),
					iat: payload2.iat
				});
			});

			describe('expires and notBefore', () => {
				beforeEach(() => {
					auth = new AuthJwt({
						expires: { minutes: 10 },
						notBefore: { minutes: 1 },
						secret: 'secret'
					});
				});

				it('should works', async () => {
					const { payload, token } = await auth.sign({ a: 1 });
					const decoded = jwt.decode(token);

					expect(decoded.payload.exp).toBeGreaterThan(decoded.payload.iat);
					expect(decoded.payload.nbf).toBeGreaterThan(decoded.payload.iat);
					expect(payload).toEqual({
						a: 1,
						exp: decoded.payload.exp,
						iat: decoded.payload.iat,
						nbf: decoded.payload.nbf
					});
				});
			});
		});

		describe('cookie', () => {
			beforeEach(() => {
				auth = new AuthJwt({
					cookie: 'token',
					secret: 'secret'
				});
			});

			it('should works', async () => {
				const { headers, payload, token } = await auth.sign({ a: 1 });
				expect(headers.has('set-cookie')).toBeTruthy();
				expect(payload).toEqual({
					a: 1,
					iat: payload?.iat
				});
				expect(token).toBeTypeOf('string');

				const { payload: payload2 } = await auth.authenticate(headers);
				expect(payload2).toEqual({
					a: 1,
					iat: payload2.iat
				});
			});
		});
	});

	describe('unauthorizedError', () => {
		describe('cookie', () => {
			it('should returns HttpError', async () => {
				auth = new AuthJwt({
					secret: 'secret'
				});

				// @ts-expect-error
				const err = await auth.unauthorizedError('auth');

				expect(err.headers).toEqual(new Headers());
				expect(err.toJson()).toEqual({
					context: { auth: 'auth' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			});

			it('should returns HttpError with cookie', async () => {
				auth = new AuthJwt({
					cookie: 'token',
					secret: 'secret'
				});

				// @ts-expect-error
				const err = await auth.unauthorizedError('auth');

				expect(err.headers).toEqual(
					new Headers({
						'set-cookie': 'token=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
					})
				);
				expect(err.toJson()).toEqual({
					context: { auth: 'auth' },
					message: 'Unauthorized',
					stack: [],
					status: 401
				});
			});
		});
	});
});
