import _ from 'lodash';
import JSON from 'use-json';

import cookieSerializer from './cookie-serializer';

namespace RequestBuilder {
	export type GenericBody = BodyInit | GenericJson;
	export type GenericCookies = Record<string, string>;
	export type GenericForm = FormData | Record<string, string | string[]>;
	export type GenericHeaders = HeadersInit | null | undefined;
	export type GenericJson = Record<string, unknown>;
	export type GenericQuery = Record<string, string | string[]>;

	export type Options = {
		body?: GenericBody;
		cookies?: GenericCookies;
		form?: GenericForm;
		headers?: GenericHeaders;
		json?: GenericJson;
		method?: string;
		query?: GenericQuery;
		signal?: AbortSignal;
	};
}

const requestBuilder = (input: string, options: RequestBuilder.Options = {}): Request => {
	let { body, cookies, form, headers, json, method = 'GET', query, signal } = options;
	let url = new URL(input);

	if (query) {
		_.forEach(query, (value, key) => {
			if (_.isArray(value)) {
				_.forEach(value, v => {
					url.searchParams.append(key, v);
				});
			} else {
				url.searchParams.set(key, value);
			}
		});
	}

	let requestBody: BodyInit = '';
	let requestHeaders = new Headers();

	if (form instanceof FormData) {
		requestBody = form;
	} else if (_.isPlainObject(form)) {
		const formData = new FormData();

		_.forEach(form, (value, key) => {
			if (_.isArray(value)) {
				_.forEach(value, v => {
					if (_.isNil(v)) {
						return;
					}

					formData.append(key, v);
				});
			} else {
				if (_.isNil(value)) {
					return;
				}

				formData.append(key, value);
			}
		});

		requestBody = formData;
	}

	if (_.isPlainObject(json)) {
		requestBody = JSON.stringify(json);
		requestHeaders.set('content-type', 'application/json');
	}

	if (body) {
		if (body instanceof FormData) {
			requestBody = body;
		} else if (_.isPlainObject(body)) {
			requestBody = JSON.stringify(body);
			requestHeaders.set('content-type', 'application/json');
		} else {
			requestBody = body as BodyInit;
		}
	}

	if (cookies) {
		let requestCookies: string[] = [];

		_.forEach(cookies, (value, key) => {
			requestCookies = requestCookies.concat(cookieSerializer.serialize(key, value, { path: '/' }));
		});

		requestHeaders.set('cookie', requestCookies.join('; '));
	}

	if (headers) {
		const ensureHeaders = new Headers(headers);

		ensureHeaders.forEach((value, key) => {
			requestHeaders.set(key, value);
		});
	}

	const requestInit: RequestInit = {
		method,
		headers: requestHeaders
	};

	const setBody = !_.includes(['GET', 'HEAD', 'OPTIONS'], _.upperCase(method));

	if (requestBody && setBody) {
		requestInit.body = requestBody;
	}

	if (signal) {
		requestInit.signal = signal;
	}

	return new Request(url, requestInit);
};

export { RequestBuilder };
export default requestBuilder;
