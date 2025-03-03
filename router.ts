import { inferValue } from 'use-infer';

import util from './util';

const emptyPathParams = Object.create(null);
const splitPathRe = /\/(:\w+(?:{(?:(?:{[\d,]+})|[^}])+})?)|\/[^\/\?]+|(\?)/g;
const splitByStarRe = /\*/;

namespace Router {
	export interface Instance<T> {
		routes: Route<T>[];
		add(method: string, path: string, handler: T): void;
		match(method: string, path: string): Response<T>[];
	}

	export type Response<T> = { handler: T; pathParams: Record<string, unknown>; rawPath: string };
	export type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: [number, number][] };

	export type Route<T> = {
		handler: T;
		method: string;
		path: string;
		rawPath: string;
	};
}

const checkOptionalParameter = (path: string): string[] | null => {
	/*
	 If path is `/api/animals/:type?` it will return:
	 [`/api/animals`, `/api/animals/:type`]
	 in other cases it will return null
	*/
	if (!path.match(/\:.+\?$/)) {
		return null;
	}

	let basePath = '';
	let results: string[] = [];
	let segments = path.split('/');

	segments.forEach(segment => {
		if (segment !== '' && !/\:/.test(segment)) {
			basePath += '/' + segment;
		} else if (/\:/.test(segment)) {
			if (/\?/.test(segment)) {
				if (results.length === 0 && basePath === '') {
					results = [...results, '/'];
				} else {
					results = [...results, basePath];
				}

				const optionalSegment = segment.replace('?', '');

				basePath += '/' + optionalSegment;
				results = [...results, basePath];
			} else {
				basePath += '/' + segment;
			}
		}
	});

	return results.filter((v, i, a) => {
		return a.indexOf(v) === i;
	});
};

class Router<T> implements Router.Instance<T> {
	public routes: Router.Route<T>[] = [];

	add(method: string, path: string, handler: T) {
		path = `/${util.pathJoin(...path.split('/'))}`;

		(checkOptionalParameter(path) || [path]).forEach(p => {
			this.routes = [
				...this.routes,
				{
					handler,
					method,
					path: p,
					rawPath: path
				}
			];
		});
	}

	match(method: string, path: string): Router.Response<T>[] {
		let handlers: Router.Response<T>[] = [];

		ROUTES_LOOP: for (let i = 0, len = this.routes.length; i < len; i++) {
			const { method: routeMethod, handler, path: routePath, rawPath: routeRawPath } = this.routes[i];

			if (routeMethod !== method && routeMethod !== 'ALL') {
				continue;
			}

			if (routePath === '*' || routePath === '/*') {
				handlers = [
					...handlers,
					{
						handler,
						pathParams: emptyPathParams,
						rawPath: routeRawPath
					}
				];
				continue;
			}

			const hasStar = routePath.indexOf('*') !== -1;
			const hasLabel = routePath.indexOf(':') !== -1;

			if (!hasStar && !hasLabel) {
				if (routePath === path || routePath + '/' === path) {
					handlers = [
						...handlers,
						{
							handler,
							pathParams: emptyPathParams,
							rawPath: routeRawPath
						}
					];
				}
			} else if (hasStar && !hasLabel) {
				const endsWithStar = routePath.charCodeAt(routePath.length - 1) === 42;
				const parts = (endsWithStar ? routePath.slice(0, -2) : routePath).split(splitByStarRe);
				const lastIndex = parts.length - 1;

				for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
					const part = parts[j];
					const index = path.indexOf(part, pos);

					if (index !== pos) {
						continue ROUTES_LOOP;
					}

					pos += part.length;

					if (j === lastIndex) {
						if (!endsWithStar && pos !== path.length && !(pos === path.length - 1 && path.charCodeAt(pos) === 47)) {
							continue ROUTES_LOOP;
						}
					} else {
						const index = path.indexOf('/', pos);

						if (index === -1) {
							continue ROUTES_LOOP;
						}

						pos = index;
					}
				}

				handlers = [
					...handlers,
					{
						handler,
						pathParams: emptyPathParams,
						rawPath: routeRawPath
					}
				];
			} else if (hasLabel && !hasStar) {
				const pathParams: Record<string, unknown> = Object.create(null);
				const parts = routePath.match(splitPathRe) as string[];
				const lastIndex = parts.length - 1;

				for (let j = 0, pos = 0, len = parts.length; j < len; j++) {
					if (pos === -1 || pos >= path.length) {
						continue ROUTES_LOOP;
					}

					const part = parts[j];
					if (part.charCodeAt(1) === 58) {
						// /:label
						let name = part.slice(2);
						let value: string;

						if (name.charCodeAt(name.length - 1) === 125) {
							// :label{pattern}
							const openBracePos = name.indexOf('{');
							const pattern = name.slice(openBracePos + 1, -1);
							const restPath = path.slice(pos + 1);
							const match = new RegExp(pattern, 'd').exec(restPath) as Router.RegExpMatchArrayWithIndices;

							if (!match || match.indices[0][0] !== 0 || match.indices[0][1] === 0) {
								continue ROUTES_LOOP;
							}

							name = name.slice(0, openBracePos);
							value = restPath.slice(...match.indices[0]);
							pos += match.indices[0][1] + 1;
						} else {
							let endValuePos = path.indexOf('/', pos + 1);
							if (endValuePos === -1) {
								if (pos + 1 === path.length) {
									continue ROUTES_LOOP;
								}

								endValuePos = path.length;
							}

							value = path.slice(pos + 1, endValuePos);
							pos = endValuePos;
						}

						pathParams[name] ||= inferValue(value);
					} else {
						const index = path.indexOf(part, pos);

						if (index !== pos) {
							continue ROUTES_LOOP;
						}

						pos += part.length;
					}

					if (j === lastIndex) {
						if (pos !== path.length && !(pos === path.length - 1 && path.charCodeAt(pos) === 47)) {
							continue ROUTES_LOOP;
						}
					}
				}

				handlers = [
					...handlers,
					{
						handler,
						pathParams,
						rawPath: routeRawPath
					}
				];
			} else if (hasLabel && hasStar) {
				throw new UnsupportedError();
			}
		}

		return handlers;
	}
}

class UnsupportedError extends Error {}

export { UnsupportedError };
export default Router;
