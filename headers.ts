import isNil from 'lodash/isNil';
import isObject from 'lodash/isObject';

const fromJson = (json: HeadersInit) => {
	return new Headers(json);
};

const merge = (...sources: (HeadersInit | null | undefined)[]) => {
	const result: Record<string, string> = {};

	for (const source of sources) {
		if (isNil(source)) {
			continue;
		}

		if (!isObject(source)) {
			throw new TypeError('All arguments must be of type object');
		}

		const headers = new Headers(source);

		for (const [key, value] of headers.entries()) {
			if (isNil(value)) {
				delete result[key];
			} else {
				result[key] = value;
			}
		}
	}

	return new Headers(result);
};

const toJson = (headers: Headers) => {
	return Object.fromEntries(headers.entries());
};

export default {
	fromJson,
	merge,
	toJson
};
