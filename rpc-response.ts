import isArray from 'lodash/isArray';
import isBoolean from 'lodash/isBoolean';
import isNull from 'lodash/isNull';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isUndefined from 'lodash/isUndefined';
import JSON from 'use-json';

import type Rpc from './rpc';

class RpcResponse<T = unknown> extends Response {
	public cache: Rpc.CacheOptions;

	constructor(body?: unknown, init?: Rpc.ResponseInit) {
		const initOptions = {
			cache: init?.cache || false,
			headers: new Headers(init?.headers),
			status: init?.status || 200
		};

		const is = {
			array: isArray(body),
			boolean: isBoolean(body),
			null: isNull(body),
			number: isNumber(body),
			plainObject: isPlainObject(body)
		};

		if (!isUndefined(body)) {
			if (is.array || is.boolean || is.null || is.number || is.plainObject) {
				body = JSON.stringify(body);

				if (!initOptions.headers.has('content-type')) {
					initOptions.headers.set('content-type', 'application/json');
				}
			} else if (!initOptions.headers.has('content-type')) {
				if (body instanceof ReadableStream) {
					initOptions.headers.set('content-type', 'application/octet-stream');
				} else if (body instanceof FormData) {
					initOptions.headers.set('content-type', 'multipart/form-data');
				} else {
					initOptions.headers.set('content-type', 'text/plain;charset=UTF-8');
				}
			}
		}

		super(body as BodyInit, {
			headers: initOptions.headers,
			status: initOptions.status
		});

		this.cache = initOptions.cache;
	}

	addDefaultHeaders(headers: Headers) {
		headers.forEach((value, key) => {
			if (this.headers.has(key)) {
				return;
			}

			this.headers.set(key, value);
		});
	}

	async json<J = T>(): Promise<J> {
		return super.json();
	}
}

export default RpcResponse;
