import _ from 'lodash';
import HttpError from 'use-http-error';

import buffer from './buffer';

namespace AuthBearer {
	export type Options = {
		hashFunction?: (a: any) => Promise<string | null>;
		header?: string;
		token: string | string[] | ((token: string) => boolean | Promise<boolean>);
	};
}

const regexp = new RegExp('^Bearer +([A-Za-z0-9._~+/-]+=*) *$');

class AuthBearer {
	private options: AuthBearer.Options;

	constructor(options: AuthBearer.Options) {
		if (!options.token && !_.isFunction(options.token)) {
			throw new Error('Bearer auth requires options for "token"');
		}

		this.options = options;
	}

	async authenticate(headers: Headers) {
		const header = headers.get(this.options.header || 'authorization');

		if (!header) {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Bearer error="inexistent_token"'
				}
			});
		}

		const match = regexp.exec(header);

		if (!match) {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Bearer error="invalid_credentials"'
				}
			});
		}

		let equal = false;

		if (_.isFunction(this.options.token)) {
			equal = await this.options.token(match[1]);
		} else if (_.isString(this.options.token)) {
			equal = await buffer.timingSafeEqual(this.options.token, match[1], this.options.hashFunction);
		} else if (_.isArray(this.options.token) && this.options.token.length > 0) {
			for (const token of this.options.token) {
				if (await buffer.timingSafeEqual(token, match[1], this.options.hashFunction)) {
					equal = true;
					break;
				}
			}
		}

		if (!equal) {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Bearer error="invalid_token"'
				}
			});
		}
	}
}

export default AuthBearer;
