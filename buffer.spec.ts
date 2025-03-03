import { describe, it, expect } from 'vitest';

import buffer from './buffer';
import crypto from './crypto';

describe('/buffer', () => {
	describe('timingSafeEqual', () => {
		it('positive', async () => {
			expect(
				await buffer.timingSafeEqual(
					'127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935',
					'127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935'
				)
			).toBeTruthy();
			expect(await buffer.timingSafeEqual('a', 'a')).toBeTruthy();
			expect(await buffer.timingSafeEqual('', '')).toBeTruthy();
			expect(await buffer.timingSafeEqual(true, true)).toBeTruthy();
			expect(await buffer.timingSafeEqual(false, false)).toBeTruthy();
			expect(await buffer.timingSafeEqual(true, true, crypto.sha256)).toBeTruthy();
		});

		it('negative', async () => {
			expect(await buffer.timingSafeEqual('a', 'b')).toBeFalsy();
			expect(await buffer.timingSafeEqual('a', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBeFalsy();
			expect(await buffer.timingSafeEqual('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'a')).toBeFalsy();
			expect(await buffer.timingSafeEqual('alpha', 'beta')).toBeFalsy();
			expect(await buffer.timingSafeEqual(false, true)).toBeFalsy();
			expect(
				await buffer.timingSafeEqual(
					() => {},
					() => {}
				)
			).toBeFalsy();
			expect(await buffer.timingSafeEqual({}, {})).toBeFalsy();
			expect(await buffer.timingSafeEqual({ a: 1 }, { a: 1 })).toBeFalsy();
			expect(await buffer.timingSafeEqual({ a: 1 }, { a: 2 })).toBeFalsy();
			expect(await buffer.timingSafeEqual([1, 2], [1, 2])).toBeFalsy();
			expect(await buffer.timingSafeEqual([1, 2], [1, 2, 3])).toBeFalsy();
		});
	});
});
