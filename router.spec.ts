import { beforeEach, describe, expect, it } from 'vitest';

import Router from './router';

describe('/router', () => {
	let router: Router<string>;

	beforeEach(() => {
		router = new Router<string>();
	});

	describe('add', () => {
		it('should normalize path', () => {
			router.add('GET', '/book-1', 'GET /book-1');
			router.add('GET', '//book-2//', 'GET /book-2');
			router.add('GET', 'book-3', 'GET /book-3');

			expect(router.routes).toEqual([
				{
					handler: 'GET /book-1',
					method: 'GET',
					path: '/book-1',
					rawPath: '/book-1'
				},
				{
					handler: 'GET /book-2',
					method: 'GET',
					path: '/book-2',
					rawPath: '/book-2'
				},
				{
					handler: 'GET /book-3',
					method: 'GET',
					path: '/book-3',
					rawPath: '/book-3'
				}
			]);
		});
	});

	describe('params with wildcard', () => {
		beforeEach(() => {
			router.add('ALL', '*', 'ALL');
			router.add('GET', '/entry/:id/*', 'entry');
		});

		it('GET /entry/123', () => {
			try {
				router.match('GET', '/entry/123');

				throw new Error('Expected to throw');
			} catch (err) {
				expect((err as Error).message).toBe('Unsupported route pattern "GET /entry/:id/*" because it contains both a label and wildcard.');
			}
		});
	});

	describe('match', () => {
		beforeEach(() => {
			router.add('ALL', '*', 'ALL');
			router.add('GET', '/book', 'GET /book');
			router.add('GET', '/book/:id?', 'GET /book/:id');
			router.add('GET', '/book/:id/:action{[a-z]+}', 'GET /book/:id/:action');
			router.add('GET', '/sitemap.xml', 'GET /sitemap.xml');
		});

		it('GET /book/', () => {
			const res = router.match('GET', '/book/');

			expect(res).toEqual([
				{
					handler: 'ALL',
					pathParams: {},
					rawPath: '/*'
				},
				{
					handler: 'GET /book',
					pathParams: {},
					rawPath: '/book'
				},
				{
					handler: 'GET /book/:id',
					pathParams: {},
					rawPath: '/book/:id?'
				}
			]);
		});

		it('GET /book/123', () => {
			const res = router.match('GET', '/book/123');

			expect(res).toEqual([
				{
					handler: 'ALL',
					pathParams: {},
					rawPath: '/*'
				},
				{
					handler: 'GET /book/:id',
					pathParams: {
						id: 123
					},
					rawPath: '/book/:id?'
				}
			]);
		});

		it('GET /book/123/save', () => {
			const res = router.match('GET', '/book/123/save');

			expect(res).toEqual([
				{
					handler: 'ALL',
					pathParams: {},
					rawPath: '/*'
				},
				{
					handler: 'GET /book/:id/:action',
					pathParams: {
						id: 123,
						action: 'save'
					},
					rawPath: '/book/:id/:action{[a-z]+}'
				}
			]);
		});

		it('GET /sitemap.xml', () => {
			const res = router.match('GET', '/sitemap.xml');

			expect(res).toEqual([
				{
					handler: 'ALL',
					pathParams: {},
					rawPath: '/*'
				},
				{
					handler: 'GET /sitemap.xml',
					pathParams: {},
					rawPath: '/sitemap.xml'
				}
			]);
		});
	});
});
