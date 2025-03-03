import { describe, expect, it } from 'vitest';

import util from './headers';

describe('/headers', () => {
	describe('fromJson', () => {
		it('should works', () => {
			const headers = util.fromJson({
				'edge-api-key-1': 'abc123',
				'edge-api-key-2': 'def456'
			});

			expect(Object.fromEntries(headers.entries())).toEqual({
				'edge-api-key-1': 'abc123',
				'edge-api-key-2': 'def456'
			});
		});
	});

	describe('mergeHeaders', () => {
		it('should works', () => {
			const a = new Headers();
			const b = new Headers({ 'edge-api-key-3': 'ghi789' });
			const headers = util.merge(
				a,
				null,
				undefined,
				{ 'edge-api-key-1': 'abc123' },
				{ 'edge-api-key-2': 'def456' },
				{ 'edge-api-key-1': 'abc124' },
				b
			);

			expect(Object.fromEntries(a.entries())).toEqual({});
			expect(Object.fromEntries(b.entries())).toEqual({
				'edge-api-key-3': 'ghi789'
			});

			expect(Object.fromEntries(headers.entries())).toEqual({
				'edge-api-key-1': 'abc124',
				'edge-api-key-2': 'def456',
				'edge-api-key-3': 'ghi789'
			});
		});
	});

	describe('toJson', () => {
		it('should works', () => {
			const headers = new Headers({
				'edge-api-key-1': 'abc123',
				'EDGE-API-KEY-2': 'def456'
			});

			expect(util.toJson(headers)).toEqual({
				'edge-api-key-1': 'abc123',
				'edge-api-key-2': 'def456'
			});
		});
	});
});
