import { describe, expect, it, vi } from 'vitest';

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

	describe('pathJoin', () => {
		it('should join paths', () => {
			expect(util.pathJoin('a', 'b', 'c')).toEqual('a/b/c');
		});

		it('should trim slashes', () => {
			expect(util.pathJoin('/a/', '/b/', '/c/')).toEqual('a/b/c');
		});
	});

	describe('readStream', () => {
		it('should convert null to empty string', async () => {
			const res = await util.readStream(null);
			expect(res).toEqual('');
		});

		it('should convert a readable stream to a string', async () => {
			const stream = util.stringToStream('Hello, world!');
			const res = await util.readStream(stream);
			expect(res).toEqual('Hello, world!');
		});

		it('should call onRead callback for each chunk', async () => {
			const stream = util.stringToStream('Hello,', ' world!');
			const onRead = vi.fn();
			const res = await util.readStream(stream, onRead);

			expect(res).toEqual('Hello, world!');
			expect(onRead).toHaveBeenCalledTimes(2);
			expect(onRead).toHaveBeenCalledWith(expect.any(Uint8Array), 'Hello,');
			expect(onRead).toHaveBeenCalledWith(expect.any(Uint8Array), ' world!');
		});
	});

	describe('readStreamToArrayBuffer', () => {
		it('should convert a readable stream to an array buffer', async () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array([1, 2, 3]));
					controller.close();
				}
			});

			const arrayBuffer = await util.readStreamToArrayBuffer(stream);
			expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
		});
	});

	describe('safeParse', () => {
		it('should parse JSON', () => {
			const obj = { foo: 'bar' };
			const str = JSON.stringify(obj);
			expect(util.safeParse(str)).toEqual(obj);
		});

		it('should return string for invalid JSON', () => {
			expect(util.safeParse('{')).toEqual('{');
		});
	});

	describe('stringHash', () => {
		it('should return a hash for a string', () => {
			expect(util.stringHash('Hello, world!')).toEqual('mmtl9ghu2aee');
		});

		it('should return 0 for an empty string', () => {
			expect(util.stringHash('')).toEqual('7h0j2bi90v2v');
		});
	});

	describe('stringToStreamWithDelay', () => {
		it('should convert strings to a stream with delay', async () => {
			vi.useFakeTimers();
			const delay = 100;
			const stream = util.stringToStreamWithDelay(delay, 'Hello,', ' world!');

			const readStreamPromise = util.readStream(stream);

			await vi.advanceTimersByTimeAsync(delay);
			await vi.advanceTimersByTimeAsync(delay);

			const res = await readStreamPromise;

			expect(res).toEqual('Hello, world!');
			vi.useRealTimers();
		});

		it('should not delay when delay is 0', async () => {
			const stream = util.stringToStreamWithDelay(0, 'Hello,', ' world!');
			const res = await util.readStream(stream);

			expect(res).toEqual('Hello, world!');
		});
	});

	describe('stringToStream', () => {
		it('should convert a string to a stream', async () => {
			const stream = util.stringToStream('Hello, world!\n', 'Hello, world!');
			const res = await util.readStream(stream);

			expect(res).toEqual('Hello, world!\nHello, world!');
		});

		it('should call onRead callback for each chunk', async () => {
			const stream = util.stringToStream('Hello,', ' world!');
			const onRead = vi.fn();
			const res = await util.readStream(stream, onRead);

			expect(res).toEqual('Hello, world!');
			expect(onRead).toHaveBeenCalledTimes(2);
			expect(onRead).toHaveBeenCalledWith(expect.any(Uint8Array), 'Hello,');
			expect(onRead).toHaveBeenCalledWith(expect.any(Uint8Array), ' world!');
		});
	});

	describe('wait', () => {
		it('should wait for a specified amount of time', async () => {
			const startTime = Date.now();
			await util.wait(100);
			const endTime = Date.now();

			expect(endTime - startTime).toBeGreaterThanOrEqual(100);
		});
	});
});
