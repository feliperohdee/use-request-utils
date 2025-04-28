import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import JSON from 'use-json';

import { SubtleCryptoImportKeyAlgorithm } from './jwt';

const arrayBufferToBase64String = (arrayBuffer: ArrayBuffer): string => {
	return btoa(bytesToByteString(new Uint8Array(arrayBuffer)));
};

const arrayBufferToBase64Url = (arrayBuffer: ArrayBuffer): string => {
	return arrayBufferToBase64String(arrayBuffer).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const arrayBufferToText = (arrayBuffer: ArrayBuffer): string => {
	return bytesToByteString(new Uint8Array(arrayBuffer));
};

const base64StringToArrayBuffer = (b64str: string): ArrayBuffer => {
	return byteStringToBytes(atob(b64str)).buffer as ArrayBuffer;
};

const base64UrlToArrayBuffer = (b64url: string): ArrayBuffer => {
	return base64StringToArrayBuffer(b64url.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
};

const base64UrlToText = (b64url: string): string => {
	return arrayBufferToText(base64UrlToArrayBuffer(b64url));
};

const bytesToByteString = (bytes: Uint8Array): string => {
	let byteStr = '';

	for (let i = 0; i < bytes.byteLength; i++) {
		byteStr += String.fromCharCode(bytes[i]);
	}

	return byteStr;
};

const byteStringToBytes = (byteStr: string): Uint8Array => {
	let bytes = new Uint8Array(byteStr.length);

	for (let i = 0; i < byteStr.length; i++) {
		bytes[i] = byteStr.charCodeAt(i);
	}

	return bytes;
};

const decodePayload = <T = any>(raw: string): T => {
	const bytes = Array.from(atob(raw), char => {
		return char.charCodeAt(0);
	});

	const decodedString = new TextDecoder('utf-8').decode(new Uint8Array(bytes));

	return JSON.parse(decodedString);
};

const deriveKey = async (secret: string | JsonWebKey | CryptoKey, enc: string): Promise<CryptoKey> => {
	const keyData = (isString(secret) ? new TextEncoder().encode(secret) : secret) as BufferSource;
	const rawKey =
		secret instanceof CryptoKey
			? secret
			: await crypto.subtle.importKey(
					'raw',
					keyData,
					{
						name: 'PBKDF2'
					},
					false,
					['deriveKey']
				);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: new TextEncoder().encode('jwt-encryption-salt').buffer as ArrayBuffer,
			iterations: 10000,
			hash: 'SHA-256'
		},
		rawKey,
		{ name: 'AES-GCM', length: enc === 'A128GCM' ? 128 : enc === 'A192GCM' ? 192 : 256 },
		false,
		['encrypt', 'decrypt']
	);
};

type KeyUsages = 'sign' | 'verify';

const importJwk = async (key: JsonWebKey, alg: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> => {
	return crypto.subtle.importKey('jwk', key, alg, true, keyUsages);
};

const importKey = async (key: string | JsonWebKey, alg: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> => {
	if (isObject(key)) {
		return importJwk(key, alg, keyUsages);
	}

	if (!isString(key)) {
		throw new Error('Unsupported key type!');
	}

	if (key.includes('PUBLIC')) {
		return importPublicKey(key, alg, keyUsages);
	}

	if (key.includes('PRIVATE')) {
		return importPrivateKey(key, alg, keyUsages);
	}

	return importTextSecret(key, alg, keyUsages);
};

const importPrivateKey = async (key: string, alg: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> => {
	return await crypto.subtle.importKey('pkcs8', pemToBinary(key), alg, true, keyUsages);
};

const importPublicKey = async (key: string, alg: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> => {
	return await crypto.subtle.importKey('spki', pemToBinary(key), alg, true, keyUsages);
};

const importTextSecret = async (key: string, alg: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> => {
	return await crypto.subtle.importKey('raw', textToArrayBuffer(key), alg, true, keyUsages);
};

const pemToBinary = (pem: string): ArrayBuffer => {
	return base64StringToArrayBuffer(pem.replace(/-+(BEGIN|END).*/g, '').replace(/\s/g, ''));
};

const textToArrayBuffer = (str: string): ArrayBuffer => {
	return byteStringToBytes(str).buffer as ArrayBuffer;
};

const textToBase64Url = (str: string): string => {
	const encoder = new TextEncoder();
	const charCodes = encoder.encode(str);
	const binaryStr = String.fromCharCode(...charCodes);
	return btoa(binaryStr).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export default {
	arrayBufferToBase64String,
	arrayBufferToBase64Url,
	arrayBufferToText,
	base64StringToArrayBuffer,
	base64UrlToArrayBuffer,
	base64UrlToText,
	bytesToByteString,
	byteStringToBytes,
	decodePayload,
	deriveKey,
	importJwk,
	importKey,
	importPrivateKey,
	importPublicKey,
	importTextSecret,
	pemToBinary,
	textToArrayBuffer,
	textToBase64Url
};
