import isDate from 'lodash/isDate';
import isPlainObject from 'lodash/isPlainObject';
import JSON from 'use-json';
import map from 'lodash/map';
import trim from 'lodash/trim';

const parseDate = (input: Date | { days?: number; hours?: number; minutes?: number }): Date => {
	const now = new Date();

	if (isDate(input)) {
		return input;
	}

	if (isPlainObject(input)) {
		let ms = 0;

		if (input.days) {
			ms += input.days * 24 * 60 * 60 * 1000;
		}

		if (input.hours) {
			ms += input.hours * 60 * 60 * 1000;
		}

		if (input.minutes) {
			ms += input.minutes * 60 * 1000;
		}

		return new Date(now.getTime() + ms);
	}

	return now;
};

const pathJoin = (...args: string[]) => {
	return map(args, token => {
		return trim(token, '/');
	})
		.filter(Boolean)
		.join('/');
};

const readStream = async (stream: ReadableStream | null, onRead?: (chunk: Uint8Array, decoded: string) => void) => {
	if (!stream) {
		return '';
	}

	let reader = stream.getReader();
	let textDecoder = new TextDecoder();
	let result = '';

	const read = async () => {
		const { done, value } = await reader.read();

		if (done) {
			return result;
		}

		const decoded = textDecoder.decode(value);

		if (onRead) {
			onRead(value, decoded);
		}

		result += decoded;
		return read();
	};

	return read();
};

const readStreamToArrayBuffer = async (stream: ReadableStream): Promise<ArrayBuffer> => {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let totalLength = 0;

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		chunks.push(value);
		totalLength += value.length;
	}

	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}

	return result.buffer;
};

const safeParse = <T = any>(input: string): T => {
	try {
		return JSON.parse(input);
	} catch {
		return input as T;
	}
};

const stringHash = (str: string) => {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ char, 2654435761);
		h2 = Math.imul(h2 ^ char, 1597334677);
	}

	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);

	return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);
};

const stringToStream = (...str: string[]) => {
	return stringToStreamWithDelay(0, ...str);
};

const stringToStreamWithDelay = (delay: number = 0, ...str: string[]) => {
	const encoder = new TextEncoder();

	return new ReadableStream({
		async start(controller) {
			for (const s of str) {
				const uint8Array = encoder.encode(s);
				controller.enqueue(uint8Array);

				if (delay > 0) {
					await wait(delay);
				}
			}
			controller.close();
		}
	});
};

const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

export default {
	parseDate,
	pathJoin,
	readStream,
	readStreamToArrayBuffer,
	safeParse,
	stringHash,
	stringToStream,
	stringToStreamWithDelay,
	wait
};
