import { describe, it, expect } from 'vitest';

import cookieParser, { CookieParser } from './cookie-parser';

describe('/cookie-parser', () => {
	it('should parse cookies', () => {
		const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry ';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toEqual('strawberry');
	});

	it('should parse quoted cookie values', () => {
		const cookieString = 'yummy_cookie="choco"; tasty_cookie = " strawberry " ; best_cookie="%20sugar%20";';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toEqual(' strawberry ');
		expect(cookies['best_cookie']).toEqual(' sugar ');
	});

	it('should parse empty cookies', () => {
		const cookies: CookieParser.Cookies = cookieParser.parse('');

		expect(Object.keys(cookies).length).toEqual(0);
	});

	it('should parse one cookie specified by name', () => {
		const cookieString = 'yummy_cookie=choco; tasty_cookie = strawberry ';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString, 'yummy_cookie');

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toBeUndefined();
	});

	it('should parse cookies with no value', () => {
		const cookieString = 'yummy_cookie=; tasty_cookie = ; best_cookie= ; last_cookie=""';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toEqual('');
		expect(cookies['tasty_cookie']).toEqual('');
		expect(cookies['best_cookie']).toEqual('');
		expect(cookies['last_cookie']).toEqual('');
	});

	it('should parse cookies but not process signed cookies', () => {
		// also contains another cookie with a '.' in its value to test it is not misinterpreted as signed cookie
		const cookieString =
			'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; great_cookie=rating3.5; best_cookie=sugar.valueShapedLikeASignatureButIsNotASignature%3D';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toEqual('strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig=');
		expect(cookies['great_cookie']).toEqual('rating3.5');
		expect(cookies['best_cookie']).toEqual('sugar.valueShapedLikeASignatureButIsNotASignature=');
	});

	it('should ignore invalid cookie names', () => {
		const cookieString = 'yummy_cookie=choco; tasty cookie=strawberry; best_cookie\\=sugar; =ng';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty cookie']).toBeUndefined();
		expect(cookies['best_cookie\\']).toBeUndefined();
		expect(cookies['']).toBeUndefined();
	});

	it('should ignore invalid cookie values', () => {
		const cookieString = 'yummy_cookie=choco\\nchip; tasty_cookie=strawberry; best_cookie="sugar';
		const cookies: CookieParser.Cookies = cookieParser.parse(cookieString);

		expect(cookies['yummy_cookie']).toBeUndefined();
		expect(cookies['tasty_cookie']).toEqual('strawberry');
		expect(cookies['best_cookie\\']).toBeUndefined();
	});

	it('should parse signed cookies', async () => {
		const secret = 'secret ingredient';
		const cookieString =
			'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toEqual('strawberry');
	});

	it('should parse signed cookies with binary secret', async () => {
		const secret = new Uint8Array([172, 142, 204, 63, 210, 136, 58, 143, 25, 18, 159, 16, 161, 34, 94]);
		const cookieString =
			'yummy_cookie=choco.8Km4IwZETZdwiOfrT7KgYjKXwiO98XIkms0tOtRa2TA%3D; tasty_cookie = strawberry.TbV33P%2Bi1K0JTxMzNYq7FV9fB4s2VlQcBCBFDxTrUSg%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toEqual('strawberry');
	});

	it('should parse signed cookies containing the signature separator', async () => {
		const secret = 'secret ingredient';
		const cookieString = 'yummy_cookie=choco.chip.2%2FJA0c68Y3zm0DvSvHyR6IRysDWmHW0LfoaC0AkyOpw%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toEqual('choco.chip');
	});

	it('should parse signed cookies and return "false" for wrong signature', async () => {
		const secret = 'secret ingredient';
		// tasty_cookie has invalid signature
		const cookieString =
			'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toEqual('choco');
		expect(cookies['tasty_cookie']).toBeFalsy();
	});

	it('should parse signed cookies and return "false" for corrupt signature', async () => {
		const secret = 'secret ingredient';
		// yummy_cookie has corrupt signature (i.e. invalid base64 encoding)
		// best_cookie has a shape that matches the signature format but isn't actually a signature
		const cookieString =
			'yummy_cookie=choco.?dFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; best_cookie=sugar.valueShapedLikeASignatureButIsNotASignature%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toBeFalsy();
		expect(cookies['tasty_cookie']).toEqual('strawberry');
		expect(cookies['best_cookie']).toBeFalsy();
	});

	it('should parse one signed cookie specified by name', async () => {
		const secret = 'secret ingredient';
		const cookieString =
			'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret, 'tasty_cookie');

		expect(cookies['yummy_cookie']).toBeUndefined();
		expect(cookies['tasty_cookie']).toEqual('strawberry');
	});

	it('should parse one signed cookie specified by name and return "false" for wrong signature', async () => {
		const secret = 'secret ingredient';
		// tasty_cookie has invalid signature
		const cookieString =
			'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie = strawberry.LAa7RX43t2vCrLNcKmNG65H41OkyV02sraRPuY5RuVg%3D';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret, 'tasty_cookie');

		expect(cookies['yummy_cookie']).toBeUndefined();
		expect(cookies['tasty_cookie']).toBeFalsy();
	});

	it('should parse signed cookies and ignore regular cookies', async () => {
		const secret = 'secret ingredient';
		// also contains another cookie with a '.' in its value to test it is not misinterpreted as signed cookie
		const cookieString =
			'yummy_cookie=choco; tasty_cookie = strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; great_cookie=rating3.5';
		const cookies: CookieParser.SignedCookie = await cookieParser.parseSigned(cookieString, secret);

		expect(cookies['yummy_cookie']).toBeUndefined();
		expect(cookies['tasty_cookie']).toEqual('strawberry');
		expect(cookies['great_cookie']).toBeUndefined();
	});
});
