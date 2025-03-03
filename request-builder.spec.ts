import { describe, it, expect } from 'vitest';

import requestBuilder from './request-builder';

describe('/request-builder', () => {
	it('should generate a GET request with query parameters', () => {
		const request = requestBuilder('https://api/users', {
			query: { page: '1', limit: '10' }
		});

		expect(request.method).toEqual('GET');
		expect(request.url).toEqual('https://api/users?page=1&limit=10');
	});

	it('should generate a POST request with FormData', async () => {
		const request = requestBuilder('https://api/upload', {
			form: {
				username: 'johndoe',
				files: ['file1.jpg', 'file2.jpg']
			},
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/upload');

		const res = await request.formData();

		expect(res.get('username')).toEqual('johndoe');
		expect(res.getAll('files')).toEqual(['file1.jpg', 'file2.jpg']);
	});

	it('should generate a POST request with raw FormData', async () => {
		const form = new FormData();

		form.append('username', 'johndoe');
		form.append('files', 'file1.jpg');
		form.append('files', 'file2.jpg');

		const request = requestBuilder('https://api/upload', {
			form,
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/upload');

		const res = await request.formData();

		expect(res.get('username')).toEqual('johndoe');
		expect(res.getAll('files')).toEqual(['file1.jpg', 'file2.jpg']);
	});

	it('should generate a POST request with JSON', async () => {
		const json = { name: 'John Doe', email: 'john@example.com' };
		const request = requestBuilder('https://api/users', {
			json,
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/users');
		expect(request.headers.get('content-type')).toEqual('application/json');

		const res = await request.json();

		expect(res).toEqual(json);
	});

	it('should generate a POST request with raw body', async () => {
		const body = 'Raw body content';
		const request = requestBuilder('https://api/users', {
			body,
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/users');

		const res = await request.text();

		expect(res).toEqual(body);
	});

	it('should generate a POST request with raw body as FormData', async () => {
		const body = new FormData();

		body.append('username', 'johndoe');
		body.append('files', 'file1.jpg');
		body.append('files', 'file2.jpg');

		const request = requestBuilder('https://api/users', {
			body,
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/users');

		const res = await request.formData();

		expect(res.get('username')).toEqual('johndoe');
		expect(res.getAll('files')).toEqual(['file1.jpg', 'file2.jpg']);
	});

	it('should generate a POST request with raw body as JSON', async () => {
		const body = { name: 'John Doe', email: 'john@example.com' };
		const request = requestBuilder('https://api/users', {
			body,
			method: 'POST'
		});

		expect(request.method).toEqual('POST');
		expect(request.url).toEqual('https://api/users');
		expect(request.headers.get('content-type')).toEqual('application/json');

		const res = await request.json();

		expect(res).toEqual(body);
	});

	it('should handle array query parameters', () => {
		const request = requestBuilder('https://api/search', {
			query: { tags: ['javascript', 'typescript'] }
		});

		expect(request.url).toEqual('https://api/search?tags=javascript&tags=typescript');
	});

	it('should set custom headers', () => {
		const request = requestBuilder('https://api/users', {
			headers: { 'edge-api-key': 'abc123' }
		});

		expect(request.headers.get('edge-api-key')).toEqual('abc123');
	});

	it('should set cookies in the request header', () => {
		const request = requestBuilder('https://api/users', {
			cookies: {
				preference: 'darkmode',
				session: 'abc123'
			}
		});

		const cookieHeader = request.headers.get('cookie');

		expect(cookieHeader).toBeDefined();
		expect(cookieHeader).toContain('session=abc123');
		expect(cookieHeader).toContain('preference=darkmode');
		expect(cookieHeader).toContain('Path=/');
	});

	it('should set signal', () => {
		const controller = new AbortController();
		controller.abort();

		const request = requestBuilder('https://api/users', { signal: controller.signal });
		expect(request.signal).toStrictEqual(controller.signal);
	});
});
