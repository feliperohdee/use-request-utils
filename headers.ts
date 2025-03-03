import _ from 'lodash';

const fromJson = (json: HeadersInit) => {
	return new Headers(json);
};

const merge = (...sources: (HeadersInit | null | undefined)[]) => {
	const result: Record<string, string> = {};

	for (const source of sources) {
		if (_.isNil(source)) {
			continue;
		}

		if (!_.isObject(source)) {
			throw new TypeError('All arguments must be of type object');
		}

		const headers = new Headers(source);

		for (const [key, value] of headers.entries()) {
			if (_.isNil(value)) {
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
