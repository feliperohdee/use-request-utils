import { beforeEach, describe, expect, it } from 'vitest';

import cookies from './cookies';

describe('/cookies', () => {
	let headers: Headers;

	beforeEach(() => {
		headers = new Headers();
	});

	describe('del', () => {
		beforeEach(() => {
			headers = new Headers({
				cookie: 'name="value"; name2="value2"'
			});
		});

		it('should works', () => {
			headers = cookies.del(headers, 'name');

			expect(headers.get('set-cookie')).toEqual('name=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
		});
	});

	describe('get', () => {
		beforeEach(() => {
			headers = new Headers({
				cookie: 'name="value"; name2="value2"'
			});
		});

		it('should get', () => {
			const res = cookies.get(headers, 'name');

			expect(res).toEqual('value');
		});

		it('should get inexistent', () => {
			const res = cookies.get(headers, 'inexistent');

			expect(res).toEqual('');
		});

		it('should get secure', () => {
			headers = new Headers({
				cookie: '__Secure-name="value"'
			});

			const res = cookies.get(headers, 'name', 'secure');

			expect(res).toEqual('value');
		});

		it('should get host', () => {
			headers = new Headers({
				cookie: '__Host-name="value"'
			});

			const res = cookies.get(headers, 'name', 'host');

			expect(res).toEqual('value');
		});
	});

	describe('getAll', () => {
		it('should get', () => {
			headers = new Headers({
				cookie: 'name="value"; name2="value2"'
			});

			const res = cookies.getAll(headers);

			expect(res).toEqual({
				name: 'value',
				name2: 'value2'
			});
		});

		it('should get inexistent', () => {
			headers = new Headers();

			const res = cookies.getAll(headers);

			expect(res).toEqual({});
		});
	});

	describe('getSigned', () => {
		it('should get', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret');

			const res = await cookies.getSigned(headers, 'name', 'secret');

			expect(res).toEqual('value');
		});

		it('should get inexistent', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret');

			const res = await cookies.getSigned(headers, 'secret', 'inexistent');

			expect(res).toEqual('');
		});

		it('should get secure', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret', {
				prefix: 'secure'
			});

			const res = await cookies.getSigned(headers, 'name', 'secret', 'secure');

			expect(res).toEqual('value');
		});

		it('should get host', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret', {
				prefix: 'host'
			});

			const res = await cookies.getSigned(headers, 'name', 'secret', 'host');

			expect(res).toEqual('value');
		});

		it('should not get if wrong secret', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'wrong-secret');

			const res = await cookies.getSigned(headers, 'name', 'secret');

			expect(res).toEqual('');
		});
	});

	describe('getAllSigned', () => {
		it('should get', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret');

			const res = await cookies.getAllSigned(headers, 'secret');

			expect(res).toEqual({
				name: 'value'
			});
		});

		it('should get inexistent', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret');

			const res = await cookies.getAllSigned(headers, 'secret');

			expect(res).toEqual({
				name: 'value'
			});
		});
	});

	describe('set', () => {
		it('should set request', () => {
			headers = cookies.set(headers, 'name', 'value');

			expect(headers.get('set-cookie')).toEqual('name=value; Path=/');
		});

		it('should set cookie with options', () => {
			headers = cookies.set(headers, 'name', 'value', {
				domain: 'example.com',
				httpOnly: true,
				maxAge: 1
			});

			expect(headers.get('set-cookie')).toEqual('name=value; Max-Age=1; Domain=example.com; Path=/; HttpOnly');
		});
	});

	describe('setSigned', () => {
		it('should set signed', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret');

			expect(headers.get('set-cookie')).toMatch(/^name=.*\..*; Path=\/$/);
		});

		it('should set signed with options', async () => {
			headers = await cookies.setSigned(headers, 'name', 'value', 'secret', {
				domain: 'example.com',
				httpOnly: true,
				maxAge: 1
			});

			expect(headers.get('set-cookie')).toMatch(/^name=.*\..*; Max-Age=1; Domain=example.com; Path=\/; HttpOnly$/);
		});
	});
});
