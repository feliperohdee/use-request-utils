import HttpError from 'use-http-error';

namespace AuthBasic {
	export interface Options {
		header?: string;
		username: string;
		password: string;
	}
}

class AuthBasic {
	private options: AuthBasic.Options;

	constructor(options: AuthBasic.Options) {
		this.options = options;
	}

	async authenticate(headers: Headers) {
		const header = headers.get(this.options.header || 'authorization');

		if (!header) {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Basic error="inexistent_token"'
				}
			});
		}

		const [scheme, credentials] = header.split(' ');

		if (scheme !== 'Basic') {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Basic error="invalid_scheme"'
				}
			});
		}

		const decoded = atob(credentials);
		const [providedUsername, providedPassword] = decoded.split(':');

		if (providedUsername !== this.options.username || providedPassword !== this.options.password) {
			throw new HttpError(401, 'Unauthorized', {
				context: {
					auth: 'Basic error="invalid_credentials"'
				}
			});
		}
	}
}

export default AuthBasic;
