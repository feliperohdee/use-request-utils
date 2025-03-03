import JSON from 'use-json';

type Algorithm = {
	name: string;
	alias: string;
};

type Data = string | boolean | number | object | ArrayBufferView | ArrayBuffer | ReadableStream;

const createHash = async (data: Data, alg: Algorithm): Promise<string | null> => {
	let sourceBuffer: ArrayBufferView | ArrayBuffer;

	if (data instanceof ReadableStream) {
		let body = '';
		const reader = data.getReader();

		await reader?.read().then(async chuck => {
			const value = await createHash(chuck.value || '', alg);
			body += value;
		});

		return body;
	}

	if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
		sourceBuffer = data;
	} else {
		if (typeof data === 'object') {
			data = JSON.stringify(data);
		}
		sourceBuffer = new TextEncoder().encode(String(data));
	}

	if (crypto && crypto.subtle) {
		const buffer = await crypto.subtle.digest({ name: alg.name }, sourceBuffer as ArrayBuffer);
		const hash = Array.prototype.map
			.call(new Uint8Array(buffer), x => {
				return ('00' + x.toString(16)).slice(-2);
			})
			.join('');

		return hash;
	}

	return null;
};

const sha256 = async (data: Data): Promise<string | null> => {
	const alg: Algorithm = { name: 'SHA-256', alias: 'sha256' };
	const hash = await createHash(data, alg);

	return hash;
};

const sha1 = async (data: Data): Promise<string | null> => {
	const alg: Algorithm = { name: 'SHA-1', alias: 'sha1' };
	const hash = await createHash(data, alg);

	return hash;
};

export default {
	sha256,
	sha1
};
