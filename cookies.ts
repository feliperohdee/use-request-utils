import cookieParser from './cookie-parser';
import cookieSerializer, { CookieSerializer } from './cookie-serializer';

const del = (headers: Headers, name: string, options?: CookieSerializer.Options): Headers => {
	const cookie = get(headers, name);

	if (!cookie) {
		return headers;
	}

	// set a new cookie with empty value and past expiration to effectively delete it
	return set(headers, name, '', {
		...options,
		expires: new Date(0),
		maxAge: 0
	});
};

const get = (headers: Headers, name: string, prefix?: CookieSerializer.PrefixOptions) => {
	const cookie = headers.get('cookie') || headers.get('set-cookie');

	if (!cookie) {
		return '';
	}

	let finalName = name;

	if (prefix === 'secure') {
		finalName = `__Secure-${name}`;
	} else if (prefix === 'host') {
		finalName = `__Host-${name}`;
	}

	const obj = cookieParser.parse(cookie, finalName);

	return obj[finalName] || '';
};

const getAll = (headers: Headers) => {
	const cookie = headers.get('cookie') || headers.get('set-cookie');

	if (!cookie) {
		return {};
	}

	return cookieParser.parse(cookie);
};

const getSigned = async (headers: Headers, name: string, secret: string, prefix?: CookieSerializer.PrefixOptions) => {
	const cookie = headers.get('cookie') || headers.get('set-cookie');

	if (!cookie) {
		return '';
	}

	let finalName = name;

	if (prefix === 'secure') {
		finalName = `__Secure-${name}`;
	} else if (prefix === 'host') {
		finalName = `__Host-${name}`;
	}

	const obj = await cookieParser.parseSigned(cookie, secret, finalName);

	return obj[finalName] || '';
};

const getAllSigned = async (headers: Headers, secret: string) => {
	const cookie = headers.get('cookie') || headers.get('set-cookie');

	if (!cookie) {
		return {};
	}

	return cookieParser.parseSigned(cookie, secret);
};

const set = (headers: Headers, name: string, value: string, options?: CookieSerializer.Options): Headers => {
	// Cookie names prefixed with __Secure- can be used only if they are set with the secure attribute.
	// Cookie names prefixed with __Host- can be used only if they are set with the secure attribute, must have a path of / (meaning any path at the host)
	// and must not have a Domain attribute.
	// Read more at https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_prefixes'
	let cookie;

	if (options?.prefix === 'secure') {
		cookie = cookieSerializer.serialize(`__Secure-${name}`, value, { path: '/', ...options, secure: true });
	} else if (options?.prefix === 'host') {
		cookie = cookieSerializer.serialize(`__Host-${name}`, value, {
			...options,
			domain: undefined,
			path: '/',
			secure: true
		});
	} else {
		cookie = cookieSerializer.serialize(name, value, { path: '/', ...options });
	}

	headers.append('set-cookie', cookie);

	return headers;
};

const setSigned = async (
	headers: Headers,
	name: string,
	value: string,
	secret: string,
	options?: CookieSerializer.Options
): Promise<Headers> => {
	let cookie;
	let signature = await cookieParser.makeSignature(value, secret);

	if (options?.prefix === 'secure') {
		cookie = await cookieSerializer.serializeSigned(`__Secure-${name}`, value, signature, {
			path: '/',
			...options,
			secure: true
		});
	} else if (options?.prefix === 'host') {
		cookie = await cookieSerializer.serializeSigned(`__Host-${name}`, value, signature, {
			...options,
			path: '/',
			secure: true,
			domain: undefined
		});
	} else {
		cookie = await cookieSerializer.serializeSigned(name, value, signature, { path: '/', ...options });
	}

	headers.append('set-cookie', cookie);

	return headers;
};

export default {
	del,
	get,
	getAll,
	getSigned,
	getAllSigned,
	set,
	setSigned
};
