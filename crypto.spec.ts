import { describe, expect, it } from 'vitest';

import crypto from './crypto';

describe('/crypto', () => {
	it('sha1 string', async () => {
		expect(await crypto.sha1('rohde')).toEqual('503f01750607b19c75b7815d7d5e9c221d48e4cc');
		expect(await crypto.sha1('炎')).toEqual('d56e09ae2421b2b8a0b5ee5fdceaed663c8c9472');
		expect(await crypto.sha1('abcdedf')).not.toEqual('abcdef');
	});
	
	it('sha256 string', async () => {
		expect(await crypto.sha256('rohde')).toEqual('1094ef31e36b77eac0a14db33f777e25a12857d4e23b3b8f395c5cb6c1a28d2a');
		expect(await crypto.sha256('炎')).toEqual('1fddc5a562ee1fbeb4fc6def7d4be4911fcdae4273b02ae3a507b170ba0ea169');
		expect(await crypto.sha256('abcdedf')).not.toEqual('abcdef');
	});

	it('sha256 objects', async () => {
		expect(await crypto.sha256({ foo: 'bar' })).not.toEqual(
			await crypto.sha256({
				bar: 'foo'
			})
		);
	});

	it('sha256 buffer', async () => {
		expect(await crypto.sha256(new Uint8Array(1))).toEqual('6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d');
		expect(await crypto.sha256(new Uint8Array(1))).not.toEqual(await crypto.sha256(new Uint8Array(2)));
	});
});
