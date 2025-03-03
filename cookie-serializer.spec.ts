import { describe, it, expect } from 'vitest';

import cookieSerializer from './cookie-serializer';

describe('/cookie-serializer', () => {
	it('should serialize cookie', () => {
		const serialized = cookieSerializer.serialize('delicious_cookie', 'macha');

		expect(serialized).toEqual('delicious_cookie=macha');
	});

	it('should serialize cookie with all options', () => {
		const serialized = cookieSerializer.serialize('__Secure-great_cookie', 'banana', {
			path: '/',
			secure: true,
			domain: 'example.com',
			httpOnly: true,
			maxAge: 1000,
			expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
			sameSite: 'Strict',
			partitioned: true
		});

		expect(serialized).toEqual(
			'__Secure-great_cookie=banana; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict; Partitioned'
		);
	});

	it('should serialize __Host- cookie with all valid options', () => {
		const serialized = cookieSerializer.serialize('__Host-great_cookie', 'banana', {
			path: '/',
			secure: true,
			httpOnly: true,
			maxAge: 1000,
			expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
			sameSite: 'Strict',
			partitioned: true
		});

		expect(serialized).toEqual(
			'__Host-great_cookie=banana; Max-Age=1000; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict; Partitioned'
		);
	});

	it('should serialize a signed cookie', async () => {
		const secret = 'secret chocolate chips';
		const serialized = await cookieSerializer.serializeSigned('delicious_cookie', 'macha', secret);

		expect(decodeURIComponent(serialized)).toEqual('delicious_cookie=macha.secret chocolate chips');
	});

	it('should serialize signed cookie with all options', async () => {
		const secret = 'secret chocolate chips';
		const serialized = await cookieSerializer.serializeSigned('great_cookie', 'banana', secret, {
			path: '/',
			secure: true,
			domain: 'example.com',
			httpOnly: true,
			maxAge: 1000,
			expires: new Date(Date.UTC(2000, 11, 24, 10, 30, 59, 900)),
			sameSite: 'Strict',
			partitioned: true
		});

		expect(decodeURIComponent(serialized)).toEqual(
			'great_cookie=banana.secret chocolate chips; Max-Age=1000; Domain=example.com; Path=/; Expires=Sun, 24 Dec 2000 10:30:59 GMT; HttpOnly; Secure; SameSite=Strict; Partitioned'
		);
	});

	it('should serialize cookie with maxAge is 0', () => {
		const serialized = cookieSerializer.serialize('great_cookie', 'banana', {
			maxAge: 0
		});

		expect(serialized).toEqual('great_cookie=banana; Max-Age=0');
	});

	it('should serialize cookie with maxAge is -1', () => {
		const serialized = cookieSerializer.serialize('great_cookie', 'banana', {
			maxAge: -1
		});

		expect(serialized).toEqual('great_cookie=banana');
	});

	it('should throw cookie with maxAge grater than 400days', () => {
		expect(() => {
			cookieSerializer.serialize('great_cookie', 'banana', {
				maxAge: 3600 * 24 * 401
			});
		}).toThrowError('Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.');
	});

	it('should throw cookie with expires grater than 400days', () => {
		const now = Date.now();
		const day401 = new Date(now + 1000 * 3600 * 24 * 401);

		expect(() => {
			cookieSerializer.serialize('great_cookie', 'banana', {
				expires: day401
			});
		}).toThrowError('Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.');
	});

	it('should throw Partitioned cookie without Secure attributes', () => {
		expect(() => {
			cookieSerializer.serialize('great_cookie', 'banana', {
				partitioned: true
			});
		}).toThrowError('Partitioned Cookie must have Secure attributes');
	});
});
