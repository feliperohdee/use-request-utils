import floor from 'lodash/floor';
import isObject from 'lodash/isObject';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import JSON from 'use-json';
import now from 'lodash/now';
import size from 'lodash/size';

import util from './jwt-util';

type SubtleCryptoHashAlgorithm = {
	name: string;
};

type SubtleCryptoImportKeyAlgorithm = {
	name: string;
	hash?: string | SubtleCryptoHashAlgorithm;
	length?: number;
	namedCurve?: string;
	compressed?: boolean;
};

namespace Jwt {
	export type Algorithm = 'ES256' | 'ES384' | 'ES512' | 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
	export type Algorithms = {
		[key: string]: SubtleCryptoImportKeyAlgorithm;
	};

	export type EncryptionEncoding = 'A128GCM' | 'A192GCM' | 'A256GCM';
	export type Header<T = any> = {
		alg?: Algorithm;
		type?: string;
	} & T;

	export type Payload<T = { [key: string]: any }> = {
		iss?: string;
		sub?: string;
		aud?: string | string[];
		exp?: number;
		nbf?: number;
		iat?: number;
		jti?: string;
	} & T;

	type Options = {
		alg?: Algorithm | string;
	};

	export type SignOptions<T> = {
		encrypt?: boolean | { enc: EncryptionEncoding };
		header?: Header<T>;
	} & Options;

	export type VerifyOptions = {
		clockTolerance?: number;
		decrypt?: boolean;
	} & Options;

	export type Data<P = any, H = any> = {
		header: Header<H>;
		payload: Payload<P>;
	};
}

const algorithms: Jwt.Algorithms = {
	ES256: { name: 'ECDSA', namedCurve: 'P-256', hash: { name: 'SHA-256' } },
	ES384: { name: 'ECDSA', namedCurve: 'P-384', hash: { name: 'SHA-384' } },
	ES512: { name: 'ECDSA', namedCurve: 'P-521', hash: { name: 'SHA-512' } },
	HS256: { name: 'HMAC', hash: { name: 'SHA-256' } },
	HS384: { name: 'HMAC', hash: { name: 'SHA-384' } },
	HS512: { name: 'HMAC', hash: { name: 'SHA-512' } },
	RS256: { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
	RS384: { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-384' } },
	RS512: { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' } }
};

const decode = <P = any, H = any>(token: string): Jwt.Data<P, H> => {
	return {
		header: util.decodePayload<Jwt.Header<H>>(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')),
		payload: util.decodePayload<Jwt.Payload<P>>(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
	};
};

const sign = async <P = any, H = any>(
	payload: Jwt.Payload<P>,
	secret: string | JsonWebKey | CryptoKey,
	options: Jwt.SignOptions<H> | Jwt.Algorithm = 'HS256'
): Promise<string> => {
	if (isString(options)) {
		options = { alg: options };
	}

	options = {
		alg: 'HS256',
		header: { type: 'JWT' } as Jwt.Header<H>,
		...options
	};

	if (!isPlainObject(payload)) {
		throw new Error('Payload must be an object');
	}

	if (!isString(secret) && !isObject(secret)) {
		throw new Error('Secret must be a string, a JWK object or a CryptoKey object');
	}

	if (!isString(options.alg)) {
		throw new Error('Options.alg must be a string');
	}

	const alg: SubtleCryptoImportKeyAlgorithm = algorithms[options.alg];

	if (!alg) {
		throw new Error('Algorithm not found');
	}

	payload.iat = floor(now() / 1000);

	const partialToken = `${util.textToBase64Url(
		JSON.stringify({
			...options.header,
			alg: options.alg
		})
	)}.${util.textToBase64Url(JSON.stringify(payload))}`;

	const key = secret instanceof CryptoKey ? secret : await util.importKey(secret, alg, ['sign']);
	const signature = await crypto.subtle.sign(alg, key, util.textToArrayBuffer(partialToken));

	let token = `${partialToken}.${util.arrayBufferToBase64Url(signature)}`;

	if (options.encrypt) {
		if (options.encrypt === true) {
			options.encrypt = { enc: 'A256GCM' };
		}

		const { enc } = options.encrypt;
		const encryptKey = await util.deriveKey(secret, enc);
		const plaintext = util.textToArrayBuffer(token);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encryptedData = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv.buffer
			},
			encryptKey,
			plaintext
		);

		const encryptedHeader = {
			alg: options.alg,
			enc,
			cty: 'JWT'
		};

		token = `${util.textToBase64Url(JSON.stringify(encryptedHeader))}.${util.arrayBufferToBase64Url(encryptedData)}.${util.arrayBufferToBase64Url(iv.buffer)}`;
	}

	return token;
};

const verify = async <P = any, H = any>(
	token: string,
	secret: string | JsonWebKey | CryptoKey,
	options: Jwt.VerifyOptions | Jwt.Algorithm = 'HS256'
): Promise<Jwt.Data<P, H>> => {
	if (isString(options)) {
		options = { alg: options };
	}

	options = {
		alg: 'HS256',
		clockTolerance: 0,
		...options
	};

	if (!isString(token)) {
		throw new Error('Token must be a string');
	}

	if (!isString(secret) && !isObject(secret)) {
		throw new Error('Secret must be a string, a JWK object or a CryptoKey object');
	}

	if (!isString(options.alg)) {
		throw new Error('Options.alg must be a string');
	}

	if (options.decrypt) {
		const [headerB64, encryptedDataB64, ivB64] = token.split('.');
		const encryptedHeader = JSON.parse(util.base64UrlToText(headerB64));

		if (encryptedHeader.alg !== options.alg) {
			throw new Error('ALG_MISMATCH');
		}

		const decryptKey = await util.deriveKey(secret, encryptedHeader.enc);
		const encryptedData = util.base64UrlToArrayBuffer(encryptedDataB64);
		const iv = util.base64UrlToArrayBuffer(ivB64);
		const decryptedData = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			decryptKey,
			encryptedData
		);

		token = util.arrayBufferToText(decryptedData);
	}

	const tokenParts = token.split('.');

	if (tokenParts.length !== 3) {
		throw new Error('Token must consist of 3 parts');
	}

	const alg: SubtleCryptoImportKeyAlgorithm = algorithms[options.alg];

	if (!alg) {
		throw new Error('Algorithm not found');
	}

	const { header, payload } = decode<P, H>(token);

	if (header?.alg !== options.alg) {
		throw new Error('ALG_MISMATCH');
	}

	if (!payload || !size(payload)) {
		throw new Error('INVALID_PAYLOAD');
	}

	const nowSeconds = floor(now() / 1000);
	if (payload.nbf && payload.nbf > nowSeconds && payload.nbf - nowSeconds > (options.clockTolerance ?? 0)) {
		throw new Error('NBF');
	}

	if (payload.exp && payload.exp <= nowSeconds && nowSeconds - payload.exp > (options.clockTolerance ?? 0)) {
		throw new Error('EXP');
	}

	const key = secret instanceof CryptoKey ? secret : await util.importKey(secret, alg, ['verify']);
	const valid = await crypto.subtle.verify(
		alg,
		key,
		util.base64UrlToArrayBuffer(tokenParts[2]),
		util.textToArrayBuffer(`${tokenParts[0]}.${tokenParts[1]}`)
	);

	if (!valid) {
		throw new Error('INVALID_SIGNATURE');
	}

	return { header, payload };
};

export { Jwt, SubtleCryptoHashAlgorithm, SubtleCryptoImportKeyAlgorithm };
export default {
	decode,
	sign,
	verify
};
