import _ from 'lodash';
import HttpError from 'use-http-error';

import { CookieSerializer } from './cookie-serializer';
import cookies from './cookies';
import jwt, { Jwt } from './jwt';
import util from './util';

namespace AuthJwt {
	export interface Options {
		alg?: Jwt.Algorithm;
		cookie?: string | { name: string; secret?: string; options?: CookieSerializer.Options };
		encrypt?: boolean | { enc: Jwt.EncryptionEncoding };
		expires?: { days?: number; hours?: number; minutes?: number };
		header?: string;
		notBefore?: { days?: number; hours?: number; minutes?: number };
		secret: string | JsonWebKey | CryptoKey;
	}

	export type Response<T> = {
		headers: Headers;
		payload: Jwt.Payload<T> | null;
	};
}

class AuthJwt {
	private options: AuthJwt.Options;

	constructor(options: AuthJwt.Options) {
		if (!options.secret) {
			throw new Error('JWT auth requires options for "secret"');
		}

		this.options = options;
	}

	async authenticate<P = any>(input: Headers | string, revalidate: boolean = false): Promise<AuthJwt.Response<P>> {
		let token = '';

		if (this.options.cookie && input instanceof Headers) {
			const headers = input;

			if (_.isString(this.options.cookie)) {
				token = cookies.get(headers, this.options.cookie);
			} else if (this.options.cookie.secret) {
				token = await cookies.getSigned(headers, this.options.cookie.name, this.options.cookie.secret, this.options.cookie.options?.prefix);
			} else {
				token = cookies.get(headers, this.options.cookie.name, this.options.cookie.options?.prefix);
			}

			if (!token) {
				throw await this.unauthorizedError('Cookie error="inexistent_token"');
			}
		} else {
			token = input instanceof Headers ? input.get(this.options.header || 'authorization') || '' : input;

			if (!token) {
				throw await this.unauthorizedError('Bearer error="inexistent_token"');
			}

			const parts = token.split(/\s+/);

			if (input instanceof Headers && _.size(parts) !== 2) {
				throw await this.unauthorizedError('Bearer error="invalid_credentials"');
			}

			token = _.last(parts) as string;
		}

		try {
			const { payload } = await jwt.verify<P>(token, this.options.secret, {
				alg: this.options.alg || 'HS256',
				decrypt: !_.isUndefined(this.options.encrypt)
			});

			if (payload && revalidate) {
				if (payload.exp && payload.exp > 0 && payload.iat && payload?.iat > 0) {
					const currentTtl = payload.exp - payload.iat;

					if (currentTtl > 0) {
						return this.sign(payload, new Date(_.now() + currentTtl * 1000));
					}
				}

				return this.sign(payload);
			}

			return { headers: new Headers(), payload: payload || null };
		} catch (err) {
			let errorType = (err as Error).message;

			switch (errorType) {
				case 'ALG_MISMATCH':
					errorType = 'algorithm_mismatch_error';
					break;
				case 'EXP':
					errorType = 'token_expired';
					break;
				case 'INVALID_PAYLOAD':
					errorType = 'payload_validation_failed';
					break;
				case 'INVALID_SIGNATURE':
					errorType = 'signature_verification_failed';
					break;
				case 'NBF':
					errorType = 'token_not_active_yet';
					break;
			}

			if (this.options.cookie) {
				throw await this.unauthorizedError(`Bearer error="${errorType}"`);
			}

			throw await this.unauthorizedError(`Bearer error="${errorType}"`);
		}
	}

	async destroy(): Promise<AuthJwt.Response<null>> {
		let headers = new Headers();

		if (this.options.cookie) {
			if (_.isString(this.options.cookie)) {
				headers = cookies.set(headers, this.options.cookie, '', { expires: new Date(0), maxAge: 0, path: '/' });
			} else if (this.options.cookie.secret) {
				headers = await cookies.setSigned(headers, this.options.cookie.name, '', this.options.cookie.secret, {
					...this.options.cookie.options,
					expires: new Date(0),
					maxAge: 0
				});
			}
		}

		return { headers, payload: null };
	}

	async sign<P = any>(payload: Jwt.Payload<P>, revalidateExpires?: Date): Promise<AuthJwt.Response<P> & { token: string }> {
		let headers = new Headers();

		const exp = revalidateExpires || this.options.expires;

		if (exp) {
			payload.exp = _.floor(util.parseDate(exp).getTime() / 1000);
		}

		if (this.options.notBefore) {
			payload.nbf = _.floor(util.parseDate(this.options.notBefore).getTime() / 1000);
		}

		const token = await jwt.sign(payload, this.options.secret, {
			alg: this.options.alg || 'HS256',
			encrypt: this.options.encrypt
		});

		if (this.options.cookie) {
			if (_.isString(this.options.cookie)) {
				headers = cookies.set(headers, this.options.cookie, token);
			} else if (this.options.cookie.secret) {
				headers = await cookies.setSigned(
					headers,
					this.options.cookie.name,
					token,
					this.options.cookie.secret,
					this.options.cookie.options
				);
			} else {
				headers = cookies.set(headers, this.options.cookie.name, token, this.options.cookie.options);
			}
		} else {
			headers.set(this.options.header || 'authorization', `Bearer ${token}`);
		}

		return { headers, payload, token };
	}

	private async unauthorizedError(message: string): Promise<HttpError> {
		// destroy cookies if they exist
		const { headers } = await this.destroy();

		return new HttpError(401, 'Unauthorized', {
			context: {
				auth: message
			},
			headers
		});
	}
}

export default AuthJwt;
