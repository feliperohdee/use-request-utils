import { beforeEach, describe, expect, it } from 'vitest';

import util from './jwt-util';

describe('/jwt-util', () => {
	describe('converters', () => {
		let testString: string;
		let testByteArray: number[];
		let testUint8Array: Uint8Array;
		let testBase64String: string;
		let testArrayBuffer: ArrayBuffer;

		beforeEach(() => {
			testString = 'cloudflare-worker-jwt';
			testByteArray = [99, 108, 111, 117, 100, 102, 108, 97, 114, 101, 45, 119, 111, 114, 107, 101, 114, 45, 106, 119, 116];
			testUint8Array = new Uint8Array(testByteArray);
			testBase64String = 'Y2xvdWRmbGFyZS13b3JrZXItand0';
			testArrayBuffer = testUint8Array.buffer as ArrayBuffer;
		});

		it('arrayBufferToBase64String', () => {
			expect(util.arrayBufferToBase64String(testArrayBuffer)).toEqual(testBase64String);
		});

		it('arrayBufferToBase64Url', () => {
			expect(util.arrayBufferToBase64Url(testArrayBuffer)).toEqual(testBase64String);
		});

		it('arrayBufferToText', () => {
			expect(util.arrayBufferToText(testArrayBuffer)).toEqual(testString);
		});

		it('base64StringToArrayBuffer', () => {
			expect(util.base64StringToArrayBuffer(testBase64String)).toEqual(testArrayBuffer);
		});

		it('base64UrlToArrayBuffer', () => {
			expect(util.base64UrlToArrayBuffer(testBase64String)).toEqual(testArrayBuffer);
		});

		it('base64UrlToText', () => {
			expect(util.base64UrlToText(testBase64String)).toEqual(testString);
		});

		it('bytesToByteString', () => {
			expect(util.bytesToByteString(testUint8Array)).toEqual(testString);
		});

		it('byteStringToBytes', () => {
			expect(util.byteStringToBytes(testString)).toEqual(testUint8Array);
		});

		it('textToArrayBuffer', () => {
			expect(util.textToArrayBuffer(testString)).toEqual(testUint8Array.buffer);
		});

		it('textToBase64Url', () => {
			expect(util.textToBase64Url(testString)).toEqual(testBase64String);
		});

		it('pemToBinary', () => {
			expect(util.pemToBinary(`-----BEGIN PUBLIC KEY-----\n${testBase64String}\n-----END PUBLIC KEY-----`)).toEqual(testArrayBuffer);
		});
	});

	describe('imports', () => {
		it('importTextSecret', async () => {
			const testKey = 'cloudflare-worker-jwt';
			const testAlgorithm = {
				name: 'HMAC',
				hash: { name: 'SHA-256' }
			};

			const testCryptoKey = {
				type: 'secret',
				extractable: true,
				algorithm: { ...testAlgorithm, length: 168 },
				usages: ['sign', 'verify']
			};

			const res = await util.importTextSecret(testKey, testAlgorithm, ['verify', 'sign']);

			expect(res.type).toEqual(testCryptoKey.type);
			expect(res.extractable).toEqual(testCryptoKey.extractable);
			expect(res.algorithm).toEqual(testCryptoKey.algorithm);
			expect(res.usages).toEqual(expect.arrayContaining(testCryptoKey.usages));
		});
	});
});
