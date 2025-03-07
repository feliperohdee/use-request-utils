import isString from 'lodash/isString';
import reduce from 'lodash/reduce';

namespace CookieParser {
	export type Cookies = Record<string, string>;
	export type SignedCookie = Record<string, string | false>;
}

const alg = {
	name: 'HMAC',
	hash: 'SHA-256'
};

const getCryptoKey = async (secret: string | BufferSource): Promise<CryptoKey> => {
	const secretBuf = isString(secret) ? new TextEncoder().encode(secret) : secret;

	return crypto.subtle.importKey('raw', secretBuf, alg, false, ['sign', 'verify']);
};

const makeSignature = async (value: string, secret: string | BufferSource): Promise<string> => {
	const key = await getCryptoKey(secret);
	const signature = await crypto.subtle.sign(alg.name, key, new TextEncoder().encode(value));

	// the returned base64 encoded signature will always be 44 characters long and end with one or two equal signs
	return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

// all alphanumeric chars and all of _!#$%&'*.^`|~+-
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
const validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;

// all ASCII chars 32-126 except 34, 59, and 92 (i.e. space to tilde but not double quote, semicolon, or backslash)
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
//
// note: the spec also prohibits comma and space, but we allow both since they are very common in the real world
// (see: https://github.com/golang/go/issues/7243)
const validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;

const parse = (cookie: string, name?: string): CookieParser.Cookies => {
	const pairs = cookie.trim().split(';');

	return reduce<string, CookieParser.Cookies>(
		pairs,
		(parsedCookie, pairStr) => {
			pairStr = pairStr.trim();

			const valueStartPos = pairStr.indexOf('=');

			if (valueStartPos === -1) {
				return parsedCookie;
			}

			const cookieName = pairStr.substring(0, valueStartPos).trim();

			if ((name && name !== cookieName) || !validCookieNameRegEx.test(cookieName)) {
				return parsedCookie;
			}

			let cookieValue = pairStr.substring(valueStartPos + 1).trim();

			if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
				cookieValue = cookieValue.slice(1, -1);
			}

			if (validCookieValueRegEx.test(cookieValue)) {
				parsedCookie[cookieName] = decodeURIComponent(cookieValue);
			}

			return parsedCookie;
		},
		{}
	);
};

const parseSigned = async (cookie: string, secret: string | BufferSource, name?: string): Promise<CookieParser.SignedCookie> => {
	const parsedCookie: CookieParser.SignedCookie = {};
	const secretKey = await getCryptoKey(secret);

	for (const [key, value] of Object.entries(parse(cookie, name))) {
		const signatureStartPos = value.lastIndexOf('.');

		if (signatureStartPos < 1) {
			continue;
		}

		const signedValue = value.substring(0, signatureStartPos);
		const signature = value.substring(signatureStartPos + 1);

		if (signature.length !== 44 || !signature.endsWith('=')) {
			continue;
		}

		const isVerified = await verifySignature(signature, signedValue, secretKey);

		parsedCookie[key] = isVerified ? signedValue : false;
	}

	return parsedCookie;
};

const verifySignature = async (base64Signature: string, value: string, secret: CryptoKey): Promise<boolean> => {
	try {
		const signatureBinStr = atob(base64Signature);
		const signature = new Uint8Array(signatureBinStr.length);

		for (let i = 0, len = signatureBinStr.length; i < len; i++) {
			signature[i] = signatureBinStr.charCodeAt(i);
		}

		return await crypto.subtle.verify(alg, secret, signature, new TextEncoder().encode(value));
	} catch {
		return false;
	}
};

export { CookieParser };
export default {
	makeSignature,
	parse,
	parseSigned,
	verifySignature
};
