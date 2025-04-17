import type { CfProperties } from '@cloudflare/workers-types';

class CustomRequest extends Request {
	public cf: CfProperties;

	constructor(
		input: RequestInfo | URL,
		init?: RequestInit & {
			cf?: CfProperties;
		}
	) {
		super(input, init);

		if (init?.cf) {
			this.cf = init.cf;
		} else {
			this.cf = {};
		}
	}
}

export default CustomRequest;
