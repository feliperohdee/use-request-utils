import { describe, expect, it } from 'vitest';

import util from './util';

describe('/util', () => {
	describe('parseDate', () => {
		it('should return the input date', () => {
			const date = new Date();
			expect(util.parseDate(date)).toEqual(date);
		});

		it('should return a date in the future', () => {
			const now = new Date();
			const date = util.parseDate({ days: 1, hours: 2, minutes: 3 });
			expect(date.getTime()).toBeGreaterThan(now.getTime());
		});
	});
});
