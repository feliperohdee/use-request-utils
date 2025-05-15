import HttpError from 'use-http-error';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import JSON from 'use-json';

import ephemeralCache from './ephemeral-cache';
import Request from './request';
import util from './util';

namespace Fetch {
	export type Abortable<T> = T & {
		abort: () => void;
	};

	export type HttpOptions = {
		init?: RequestInit | null;
		ephemeralCacheTtlSeconds?: number;
	};

	export interface Http {
		<T>(info: RequestInfo, options?: HttpOptions): Abortable<Promise<T>>;
		asResponse(info: RequestInfo, options?: HttpOptions): Abortable<Promise<Response>>;
		asObject<T>(info: RequestInfo, options?: HttpOptions): Abortable<Promise<{ body: T; headers: Headers; status: number }>>;
	}
}

const handleError = async (res: Response) => {
	const body = JSON.safeParse(await util.readStream(res.body));

	if (!res.ok) {
		if (isPlainObject(body)) {
			return HttpError.fromJson(body as HttpError.Json);
		}

		return HttpError.wrap(isString(body) ? body : '', res.status);
	}
};

const http: Fetch.Http = (<T>(info: RequestInfo, options?: Fetch.HttpOptions) => {
	const abortableResponse = http.asResponse(info, options);
	const promise = (async () => {
		const res = await abortableResponse;

		if (!res.ok) {
			throw await handleError(res);
		}

		const json = res.headers.get('content-type')?.includes('application/json');
		const body = await util.readStream(res.body);

		return json ? JSON.safeParse<T>(body) : body;
	})();

	return Object.assign(promise, { abort: abortableResponse.abort });
}) as Fetch.Http;

http.asObject = <T>(info: RequestInfo, options?: Fetch.HttpOptions) => {
	const abortableResponse = http.asResponse(info, options);
	const promise = (async () => {
		const res = await abortableResponse;
		const json = res.headers.get('content-type')?.includes('application/json');
		const body = await util.readStream(res.body);

		return {
			body: (json ? JSON.safeParse<T>(body) : body) as T,
			headers: res.headers,
			status: res.status
		};
	})();

	return Object.assign(promise, { abort: abortableResponse.abort });
};

http.asResponse = (info: RequestInfo, options?: Fetch.HttpOptions) => {
	const controller = new AbortController();
	const promise = (async () => {
		try {
			const httpOptions = new HttpOptions(options);
			const req = new Request(info, {
				signal: controller.signal,
				...httpOptions.init
			});

			if (req.method === 'GET' || req.method === 'HEAD') {
				return await ephemeralCache.wrap(
					req.url,
					() => {
						return fetch(req);
					},
					{
						refreshTtl: true,
						ttlSeconds: httpOptions.ephemeralCacheTtlSeconds
					}
				);
			}

			return await fetch(req);
		} catch (err) {
			throw HttpError.wrap(err as Error);
		}
	})();

	return Object.assign(promise, {
		abort: () => {
			controller.abort(new HttpError(499, 'Graceful Abort'));
		}
	});
};

class HttpOptions implements Fetch.HttpOptions {
	public ephemeralCacheTtlSeconds: number;
	public init: RequestInit | null;

	constructor(options?: Fetch.HttpOptions) {
		this.ephemeralCacheTtlSeconds = isNumber(options?.ephemeralCacheTtlSeconds) ? options.ephemeralCacheTtlSeconds : 1;
		this.init = options?.init || null;
	}
}

export { Fetch, HttpOptions };
export default { http };
