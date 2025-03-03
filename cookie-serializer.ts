import _ from 'lodash';

namespace CookieSerializer {
	export type PartitionConstraint = { partition: true; secure: true } | { partition?: boolean; secure?: boolean }; // reset to default
	export type SecureConstraint = { secure: true };
	export type HostConstraint = { secure: true; path: '/'; domain?: undefined };

	export type Options = {
		domain?: string;
		expires?: Date;
		httpOnly?: boolean;
		maxAge?: number;
		path?: string;
		secure?: boolean;
		sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none';
		partitioned?: boolean;
		prefix?: PrefixOptions;
	} & PartitionConstraint;

	export type PrefixOptions = 'host' | 'secure';

	export type Constraint<Name> = Name extends `__Secure-${string}`
		? Options & SecureConstraint
		: Name extends `__Host-${string}`
			? Options & HostConstraint
			: Options;
}

const _serialize = (name: string, value: string, options: CookieSerializer.Options = {}): string => {
	let cookie = `${name}=${value}`;

	if (name.startsWith('__Secure-') && !options.secure) {
		// FIXME: replace link to RFC
		// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.3.1
		throw new Error('__Secure- Cookie must have Secure attributes');
	}

	if (name.startsWith('__Host-')) {
		// FIXME: replace link to RFC
		// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.3.2
		if (!options.secure) {
			throw new Error('__Host- Cookie must have Secure attributes');
		}

		if (options.path !== '/') {
			throw new Error('__Host- Cookie must have Path attributes with "/"');
		}

		if (options.domain) {
			throw new Error('__Host- Cookie must not have Domain attributes');
		}
	}

	if (options && _.isNumber(options.maxAge) && options.maxAge >= 0) {
		if (options.maxAge > 34560000) {
			// FIXME: replace link to RFC
			// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.2.2
			throw new Error('Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.');
		}

		cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
	}

	if (options.domain && options.prefix !== 'host') {
		cookie += `; Domain=${options.domain}`;
	}

	if (options.path) {
		cookie += `; Path=${options.path}`;
	}

	if (options.expires) {
		if (options.expires.getTime() - Date.now() > 34560000_000) {
			// FIXME: replace link to RFC
			// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.2.1
			throw new Error('Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.');
		}

		cookie += `; Expires=${options.expires.toUTCString()}`;
	}

	if (options.httpOnly) {
		cookie += '; HttpOnly';
	}

	if (options.secure) {
		cookie += '; Secure';
	}

	if (options.sameSite) {
		cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
	}

	if (options.partitioned) {
		// FIXME: replace link to RFC
		// https://www.ietf.org/archive/id/draft-cutler-httpbis-partitioned-cookies-01.html#section-2.3
		if (!options.secure) {
			throw new Error('Partitioned Cookie must have Secure attributes');
		}

		cookie += '; Partitioned';
	}

	return cookie;
};

const serialize = <Name extends string>(name: Name, value: string, options?: CookieSerializer.Constraint<Name>): string => {
	value = encodeURIComponent(value);

	return _serialize(name, value, options);
};

const serializeSigned = async (name: string, value: string, signature: string, options: CookieSerializer.Options = {}): Promise<string> => {
	value = `${value}.${signature}`;
	value = encodeURIComponent(value);

	return _serialize(name, value, options);
};

export { CookieSerializer };
export default {
	serialize,
	serializeSigned
};
