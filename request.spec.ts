import { expect, describe, it } from 'vitest';

import Request from './request';

describe('./request', () => {
	it('should create request', () => {
		const req = new Request('http://localhost/rpc');

		expect(req.cf).toEqual({});
	});

	it('should create request with cf', () => {
		const req = new Request('http://localhost/rpc', {
			cf: { country: 'US' }
		});

		expect(req.cf).toEqual({ country: 'US' });
	});
});
