import headers from 'use-request-utils/headers';

import MapStore from './map-store';

namespace RpcContext {
	export type Options = {
		body: ReadableStream | null;
		cf: CfProperties;
		headers: Headers;
	};
}

class RpcContext extends MapStore {
	public body: ReadableStream | null;
	public cf: CfProperties;
	public headers: Headers;
	public defaultResponseMeta: {
		headers: Headers;
		status: number;
	};

	constructor(options: RpcContext.Options) {
		super({}, 'public');

		this.body = options.body || null;
		this.cf = options.cf;
		this.headers = options.headers;
		this.defaultResponseMeta = {
			headers: new Headers(),
			status: 0
		};
	}

	setDefaultResponseHeaders(headers: Headers) {
		this.defaultResponseMeta.headers = headers;
	}

	setDefaultResponseStatus(status: number) {
		this.defaultResponseMeta.status = status;
	}

	toJson(): Record<string, any> {
		return {
			cf: this.cf,
			data: super.toJson(),
			headers: headers.toJson(this.headers)
		};
	}
}

export default RpcContext;
