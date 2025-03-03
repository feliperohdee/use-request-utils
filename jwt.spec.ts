import { beforeEach, describe, expect, it } from 'vitest';

import jwt from './jwt';

describe('/jwt', () => {
	let expiredToken: string;
	let invalidAlgToken: string;
	let invalidExpiredToken: string;
	let invalidNoBeforeToken: string;
	let invalidPayloadToken: string;
	let invalidSignatureToken: string;
	let now: number;
	let offset: number;
	let secret: string;
	let validToken: string;
	let validEncryptedToken: string;

	beforeEach(async () => {
		secret = 'super-secret';
		now = Math.floor(Date.now() / 1000);
		offset = 30; // 30 seconds

		expiredToken = await jwt.sign(
			{
				sub: 'me',
				exp: now - offset
			},
			secret
		);

		invalidAlgToken = await jwt.sign(
			{
				sub: 'me'
			},
			secret,
			{
				alg: 'HS384'
			}
		);

		invalidExpiredToken = await jwt.sign(
			{
				sub: 'me',
				exp: now + offset
			},
			secret
		);

		invalidPayloadToken = 'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFMyNTYifQ.e30.e95jovRSBILroCGz7g5giuw5796dg37A1cyXoTy0JHU';
		invalidSignatureToken = await jwt.sign(
			{
				sub: 'me'
			},
			'invalid-secret'
		);

		invalidNoBeforeToken = await jwt.sign(
			{
				sub: 'me',
				nbf: now + offset
			},
			secret
		);

		validToken = await jwt.sign(
			{
				sub: 'me',
				nbf: now - offset
			},
			secret
		);

		validEncryptedToken = await jwt.sign(
			{
				sub: 'me'
			},
			secret,
			{
				encrypt: true
			}
		);
	});

	it('should works', async () => {
		const res = await jwt.verify(validToken, secret);

		expect(res).toEqual({
			header: {
				type: 'JWT',
				alg: 'HS256'
			},
			payload: {
				sub: 'me',
				nbf: res.payload.nbf,
				iat: res.payload.iat
			}
		});
	});

	it('should works encrypted', async () => {
		const res = await jwt.verify(validEncryptedToken, secret, {
			decrypt: true
		});

		expect(res).toEqual({
			header: {
				type: 'JWT',
				alg: 'HS256'
			},
			payload: {
				sub: 'me',
				nbf: res.payload.nbf,
				iat: res.payload.iat
			}
		});
	});

	it('should works with not yet expired', async () => {
		const res = await jwt.verify(invalidExpiredToken, secret);

		expect(res).toEqual({
			header: {
				type: 'JWT',
				alg: 'HS256'
			},
			payload: {
				sub: 'me',
				exp: res.payload.exp,
				iat: res.payload.iat
			}
		});
	});

	it('should throw if invalid algorithm', async () => {
		try {
			await jwt.verify(invalidAlgToken, secret);

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('ALG_MISMATCH');
		}
	});

	it('should throw if invalid payload', async () => {
		try {
			await jwt.verify(invalidPayloadToken, secret);

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('INVALID_PAYLOAD');
		}
	});

	it('should throw if invalid not before', async () => {
		try {
			await jwt.verify(invalidNoBeforeToken, secret);

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('NBF');
		}
	});

	it('should throw if expired', async () => {
		try {
			await jwt.verify(expiredToken, secret);

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('EXP');
		}
	});

	it('should throw if invalid signature', async () => {
		try {
			await jwt.verify(invalidSignatureToken, secret);

			throw new Error('Expected to throw');
		} catch (err) {
			expect((err as Error).message).toEqual('INVALID_SIGNATURE');
		}
	});
});
