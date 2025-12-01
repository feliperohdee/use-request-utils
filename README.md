# use-request-utils

A lightweight, [browser, cloudflare workers, node, deno, etc.] compatible collection of utilities for handling web requests, authentication, cookies, JWT tokens, caching, and cryptographic operations.

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Index

- [Installation](#installation)
- [Features](#features)
- **Core Modules:**
  - [Headers Utilities](#headers-utilities-headersts)
  - [Cookie Parser](#cookie-parser-cookie-parserts)
  - [Cookie Serializer](#cookie-serializer-cookie-serializerts)
  - [Cookies](#cookies-cookiests)
  - [Cryptography Utilities](#cryptography-utilities-cryptots)
  - [Ephemeral Cache](#ephemeral-cache-ephemeral-cachets)
  - [Fetch Utilities](#fetch-utilities-fetchts)
  - [JWT Utilities](#jwt-utilities-jwtts)
  - [Map Store](#map-store-map-storets)
  - [Request Builder](#request-builder-request-builderts)
  - [Custom Request Class](#custom-request-class-requestts)
  - [Router](#router-routerts)
  - [General Utilities](#general-utilities-utilts)
- **RPC (Remote Procedure Call) Modules:**
  - [RPC Context](#rpc-context-rpc-contextts)
  - [RPC Response](#rpc-response-rpc-responsets)
  - [RPC Base Class](#rpc-base-class-rpcts)
  - [RPC Proxy](#rpc-proxy-rpc-proxyts)
- **React Hooks:**
  - [useFetchHttp](#usefetchhttp-react-hook-use-fetch-httpts)
  - [useFetchRpc](#usefetchrpc-react-hook-use-fetch-rpcts)
- [Author](#author)
- [License](#license)

## Installation

```bash
npm install use-request-utils
```

or with yarn:

```bash
yarn add use-request-utils
```

## Features

- 🍪 **Cookie Management**: Comprehensive cookie handling (`cookie-parser`, `cookie-serializer`, `cookies`) with support for signed cookies and standard attributes (HttpOnly, Secure, SameSite, Max-Age, Expires, Path, Domain, Partitioned, Prefixes).
- 🔑 **JWT Tokens**: Robust JWT generation, verification, and decoding (`jwt`) using Web Crypto API, supporting various algorithms (HS\*, RS\*, ES\*) and optional encryption (AES-GCM).
- 🔒 **Cryptography**: Standard cryptographic hashing utilities (`crypto`) including SHA-1 and SHA-256 for strings, objects, and buffers.
- 📋 **Headers**: Convenient utilities (`headers`) for managing HTTP headers, including creation from JSON, merging multiple sources, and conversion back to JSON.
- 🛠️ **Request Builder**: Fluent API (`request-builder`) for constructing `Request` objects with easy handling of query parameters, JSON bodies, form data, cookies, and headers.
- 📡 **Enhanced Fetch**: A wrapper around the standard `fetch` (`fetch`) providing automatic integration with `ephemeral-cache` for GET/HEAD requests, standardized error handling using `HttpError`, and abortable requests.
- ⚡ **Ephemeral Cache**: A lightweight, time-aware in-memory cache (`ephemeral-cache`) specifically designed for `Response` objects, featuring automatic expiration, request deduplication via `wrap`, and cache status headers.
- 🧭 **Router**: Fast and flexible request routing (`router`) with support for path parameters (including optional and regex-constrained parameters), wildcards, and automatic type inference for parameters.
- 📞 **RPC Framework**: A simple yet powerful RPC system (`rpc`, `rpc-proxy`, `rpc-context`, `rpc-response`) enabling type-safe client-server communication, batching requests, and flexible response types (`.asObject()`, `.asResponse()`).
- ⚛️ **React Hooks**: Ready-to-use React hooks (`use-fetch-http`, `use-fetch-rpc`) for declarative data fetching with features like dependency tracking, debouncing, mapping, conditional fetching, and interval polling.
- 📦 **Map Store**: A general-purpose, Map-based key-value store (`map-store`) with support for public/private scoping, useful for managing state within request lifecycles (like `RpcContext`).
- ⚙️ **Utilities**: A collection of general utility functions (`util`) for common tasks like path joining, stream reading, safe JSON parsing, date parsing, and string hashing.
- ☁️ **Environment Agnostic**: Designed to work seamlessly in various JavaScript environments including browsers, Cloudflare Workers, Node.js, and Deno.
- 🔷 **TypeScript**: Fully written in TypeScript with comprehensive type definitions for enhanced developer experience and safety.

---

## Core Modules

### Headers Utilities (`/headers.ts`)

This module provides utility functions for working with the standard `Headers` object.

#### `fromJson`

Creates a `Headers` object from a `HeadersInit` object (which can be a plain object, an array of key-value pairs, or another `Headers` object).

**Parameters:**

- `json` (`HeadersInit`): The input object or array to convert into Headers.

**Returns:**

- (`Headers`): A new `Headers` instance.

**Usage Example:**

```typescript
import headersUtil from 'use-request-utils/headers';

const headers = headersUtil.fromJson({
	'edge-api-key-1': 'abc123',
	'edge-api-key-2': 'def456'
});

// headers is now a Headers object
console.log(headers.get('edge-api-key-1')); // Output: abc123

// Convert back to plain object for verification (optional)
const plainObject = Object.fromEntries(headers.entries());
console.log(plainObject);
// Output: { 'edge-api-key-1': 'abc123', 'edge-api-key-2': 'def456' }
```

#### `merge`

Merges multiple header sources into a single `Headers` object. Sources can be `Headers` objects, plain objects (`Record<string, string>`), or arrays of key-value pairs (`[string, string][]`).

Later sources override keys from earlier sources. If a header _value_ in a source is `null` or `undefined`, the corresponding header key will be removed from the final merged result. `null` or `undefined` sources are skipped.

**Parameters:**

- `...sources` (`(HeadersInit | null | undefined)[]`): A variable number of header sources to merge.

**Returns:**

- (`Headers`): A new `Headers` instance containing the merged headers.

**Throws:**

- `TypeError`: If any argument (that isn't `null` or `undefined`) is not an object-like structure compatible with `HeadersInit`.

**Usage Example:**

```typescript
import headersUtil from 'use-request-utils/headers';

const baseHeaders = new Headers();
const apiHeaders = { 'edge-api-key-1': 'abc123' };
const userHeaders = new Headers({ 'edge-api-key-2': 'def456' });
const overrideHeaders = { 'edge-api-key-1': 'abc124' }; // Overrides the first key
const thirdPartyHeaders = new Headers({ 'edge-api-key-3': 'ghi789' });
const removalHeaders = { 'edge-api-key-2': null }; // This will remove edge-api-key-2

const mergedHeaders = headersUtil.merge(
	baseHeaders,
	null, // ignored
	undefined, // ignored
	apiHeaders,
	userHeaders,
	overrideHeaders,
	thirdPartyHeaders
	// removalHeaders, // Example if we wanted to remove edge-api-key-2
);

// Convert back to plain object for verification
const plainObject = Object.fromEntries(mergedHeaders.entries());
console.log(plainObject);
// Output: { 'edge-api-key-1': 'abc124', 'edge-api-key-2': 'def456', 'edge-api-key-3': 'ghi789' }
```

#### `toJson`

Converts a `Headers` object into a plain JavaScript object (`Record<string, string>`). Header names are normalized to lowercase.

**Parameters:**

- `headers` (`Headers`): The `Headers` instance to convert.

**Returns:**

- (`Record<string, string>`): A plain object representation of the headers.

**Usage Example:**

```typescript
import headersUtil from 'use-request-utils/headers';

const myHeaders = new Headers({
	'edge-api-key-1': 'abc123',
	'EDGE-API-KEY-2': 'def456' // Name will be normalized
});

const jsonHeaders = headersUtil.toJson(myHeaders);

console.log(jsonHeaders);
// Output: { 'edge-api-key-1': 'abc123', 'edge-api-key-2': 'def456' }
```

### Cookie Parser (`/cookie-parser.ts`)

Utilities for parsing `Cookie` header strings into JavaScript objects and verifying signed cookies.

This module relies on the Web Crypto API for cryptographic operations (`crypto.subtle`).

#### Types

##### `CookieParser.Cookies`

```typescript
type Cookies = Record<string, string>;
```

A simple object where keys are cookie names and values are the corresponding cookie values.

##### `CookieParser.SignedCookie`

```typescript
type SignedCookie = Record<string, string | false>;
```

An object where keys are cookie names. Values are the original cookie value if the signature is valid, or `false` if the signature is invalid or missing.

#### `parse`

Parses a `Cookie` header string into an object of key-value pairs. It handles URI decoding and quoted values.

**Parameters:**

- `cookie` (`string`): The raw `Cookie` header string (e.g., `'yummy_cookie=choco; tasty_cookie=strawberry'`).
- `name` (`string`, optional): If provided, only the cookie with this specific name will be parsed and returned in the object.

**Returns:**

- (`CookieParser.Cookies`): An object containing the parsed cookies.

**Usage Examples:**

```typescript
import cookieParser from 'use-request-utils/cookie-parser';

// Parse all cookies
const cookieString1 = 'yummy_cookie=choco; tasty_cookie=strawberry; best_cookie="%20sugar%20";';
const cookies1 = cookieParser.parse(cookieString1);
console.log(cookies1);
// Output: { yummy_cookie: 'choco', tasty_cookie: 'strawberry', best_cookie: ' sugar ' }

// Parse a specific cookie
const cookieString2 = 'yummy_cookie=choco; tasty_cookie=strawberry';
const cookies2 = cookieParser.parse(cookieString2, 'yummy_cookie');
console.log(cookies2);
// Output: { yummy_cookie: 'choco' }

// Parse empty string
const cookies3 = cookieParser.parse('');
console.log(cookies3);
// Output: {}

// Ignores invalid names/values
const cookieString4 = 'yummy_cookie=choco; tasty cookie=strawberry; yummy_cookie=choco\\nchip;';
const cookies4 = cookieParser.parse(cookieString4);
console.log(cookies4);
// Output: { yummy_cookie: 'choco' }
```

#### `parseSigned`

Parses a `Cookie` header string and verifies the signatures of potential signed cookies using a secret key.

Signed cookies are expected in the format `key=value.signature`. Only cookies matching this format with a valid signature are included in the result with their original value. Invalid or unsigned cookies are omitted or set to `false`.

**Parameters:**

- `cookie` (`string`): The raw `Cookie` header string.
- `secret` (`string | BufferSource`): The secret key used for signing. Can be a string or a BufferSource (like `Uint8Array`).
- `name` (`string`, optional): If provided, only the signed cookie with this specific name will be parsed and verified.

**Returns:**

- (`Promise<CookieParser.SignedCookie>`): A promise resolving to an object containing the verified signed cookies. Values are the original string if valid, `false` otherwise.

**Usage Examples:**

```typescript
import cookieParser from 'use-request-utils/cookie-parser';

const secret = 'secret ingredient';

// Parse all signed cookies
const cookieString1 =
	'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie=strawberry.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D; regular_cookie=vanilla';
const cookies1 = await cookieParser.parseSigned(cookieString1, secret);
console.log(cookies1);
// Output: { yummy_cookie: 'choco', tasty_cookie: 'strawberry' } (regular_cookie ignored)

// Parse specific signed cookie
const cookies2 = await cookieParser.parseSigned(cookieString1, secret, 'tasty_cookie');
console.log(cookies2);
// Output: { tasty_cookie: 'strawberry' }

// Handle invalid signature
const cookieString3 = 'yummy_cookie=choco.UdFR2rBpS1GsHfGlUiYyMIdqxqwuEgplyQIgTJgpGWY%3D; tasty_cookie=strawberry.INVALID_SIGNATURE';
const cookies3 = await cookieParser.parseSigned(cookieString3, secret);
console.log(cookies3);
// Output: { yummy_cookie: 'choco', tasty_cookie: false }
```

#### `makeSignature`

Generates an HMAC-SHA256 signature for a given value using a secret key. The signature is returned as a Base64 encoded string.

**Parameters:**

- `value` (`string`): The value to sign.
- `secret` (`string | BufferSource`): The secret key used for signing.

**Returns:**

- (`Promise<string>`): A promise resolving to the Base64 encoded signature.

**Usage Example:**

```typescript
import cookieParser from 'use-request-utils/cookie-parser';

const secret = 'my-secret';
const value = 'user-session-data';

const signature = await cookieParser.makeSignature(value, secret);
console.log(signature); // Output: Base64 signature string (e.g., "...")

// Example of creating a signed cookie value string
const signedCookieValue = `${value}.${signature}`;
```

#### `verifySignature`

Verifies if a given Base64 signature matches a value using a secret key.

**Parameters:**

- `base64Signature` (`string`): The Base64 encoded signature to verify.
- `value` (`string`): The original value that was signed.
- `secret` (`CryptoKey`): The _imported_ `CryptoKey` object representing the secret. (Use `crypto.subtle.importKey` or the internal `getCryptoKey` logic if needed).

**Returns:**

- (`Promise<boolean>`): A promise resolving to `true` if the signature is valid, `false` otherwise.

**Note:** This is a lower-level function. `parseSigned` is generally preferred for parsing headers.

### Cookie Serializer (`/cookie-serializer.ts`)

Utilities for serializing cookie names and values into `Set-Cookie` header strings, including support for various attributes like `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Expires`, `Domain`, `Path`, `Partitioned`, and cookie prefixes (`__Secure-`, `__Host-`).

This module relies on the Web Crypto API for cryptographic operations (`crypto.subtle`) when using `serializeSigned`.

#### Types

##### `CookieSerializer.Options`

```typescript
type Options = {
	domain?: string;
	expires?: Date;
	httpOnly?: boolean;
	maxAge?: number; // In seconds
	path?: string;
	secure?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none';
	partitioned?: boolean;
	prefix?: 'host' | 'secure'; // Internal helper, not a standard cookie attribute
} & PartitionConstraint; // Ensures 'partitioned' requires 'secure'

// Constraints based on prefixes:
type Constraint<Name> = Name extends `__Secure-${string}`
	? Options & { secure: true } // __Secure- requires secure
	: Name extends `__Host-${string}`
		? Options & { secure: true; path: '/'; domain?: undefined } // __Host- requires secure, path='/', no domain
		: Options;
```

An object defining attributes for the `Set-Cookie` header.

- `domain`: Specifies the domain for which the cookie is valid.
- `expires`: Sets an absolute expiration date/time.
- `httpOnly`: If true, the cookie cannot be accessed via client-side JavaScript.
- `maxAge`: Sets the cookie's lifespan in seconds. If 0, expires immediately. If negative, treated as session cookie (omitted). Values > 400 days throw an error.
- `path`: Specifies the URL path that must exist in the requested URL.
- `secure`: If true, the cookie is only sent over HTTPS. Required for `SameSite=None` and `Partitioned`.
- `sameSite`: Controls cross-site request behavior ('Strict', 'Lax', 'None'). Case-insensitive input is normalized.
- `partitioned`: If true, associates the cookie with the top-level site where it's embedded. Requires `secure: true`.
- `prefix`: (Internal helper in `cookies.ts`) Used to automatically apply prefix rules (`__Secure-`, `__Host-`). Not a standard cookie attribute itself.

#### `serialize`

Serializes a cookie name and value into a `Set-Cookie` header string with specified options. The value is automatically URI-encoded.

**Parameters:**

- `name` (`string`): The name of the cookie. If using prefixes (`__Secure-`, `__Host-`), constraints are checked.
- `value` (`string`): The value of the cookie. Will be URI-encoded.
- `options` (`CookieSerializer.Constraint<Name>`, optional): An object containing cookie attributes. Types ensure constraints for prefixes are met.

**Returns:**

- (`string`): The formatted `Set-Cookie` header string.

**Throws:**

- `Error`: If prefix constraints (`__Secure-`, `__Host-`) are violated.
- `Error`: If `partitioned` is true but `secure` is not.
- `Error`: If `maxAge` or `expires` exceed the 400-day limit.

**Usage Examples:**

```typescript
import cookieSerializer from 'use-request-utils/cookie-serializer';

// Simple cookie
const simple = cookieSerializer.serialize('myCookie', 'myValue');
console.log(simple); // Output: myCookie=myValue

// Cookie with options
const complex = cookieSerializer.serialize('session', 'user123', {
	path: '/',
	httpOnly: true,
	secure: true,
	maxAge: 3600, // 1 hour
	sameSite: 'Lax',
	domain: 'example.com'
});
console.log(complex);
// Output: session=user123; Max-Age=3600; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax

// __Secure- prefix cookie
const securePrefixed = cookieSerializer.serialize('__Secure-pref', 'dark', {
	secure: true, // Required
	path: '/settings'
});
console.log(securePrefixed);
// Output: __Secure-pref=dark; Path=/settings; Secure

// __Host- prefix cookie
const hostPrefixed = cookieSerializer.serialize('__Host-user', 'admin', {
	secure: true, // Required
	path: '/', // Required
	httpOnly: true
	// domain must NOT be set
});
console.log(hostPrefixed);
// Output: __Host-user=admin; Path=/; HttpOnly; Secure

// Partitioned cookie
const partitioned = cookieSerializer.serialize('embedId', 'xyz789', {
	secure: true, // Required
	partitioned: true,
	path: '/'
});
console.log(partitioned);
// Output: embedId=xyz789; Path=/; Secure; Partitioned
```

#### `serializeSigned`

Serializes a cookie name, value, and a pre-computed signature into a `Set-Cookie` header string. The value and signature are combined (`value.signature`) and then URI-encoded.

**Parameters:**

- `name` (`string`): The name of the cookie.
- `value` (`string`): The original value of the cookie.
- `signature` (`string`): The Base64 signature generated for the value (e.g., using `cookieParser.makeSignature`).
- `options` (`CookieSerializer.Options`, optional): An object containing cookie attributes.

**Returns:**

- (`Promise<string>`): A promise resolving to the formatted `Set-Cookie` header string for the signed cookie.

**Usage Example:**

```typescript
import cookieSerializer from 'use-request-utils/cookie-serializer';
import cookieParser from 'use-request-utils/cookie-parser'; // To generate signature

const secret = 'my-signing-secret';
const value = 'sensitive-data';

// 1. Generate the signature
const signature = await cookieParser.makeSignature(value, secret);

// 2. Serialize the signed cookie
const signedCookieString = await cookieSerializer.serializeSigned('authToken', value, signature, {
	httpOnly: true,
	secure: true,
	path: '/',
	maxAge: 86400 // 1 day
});

console.log(signedCookieString);
// Output: authToken=sensitive-data.SIGNATURE_STRING; Max-Age=86400; Path=/; HttpOnly; Secure
// (where SIGNATURE_STRING is the URI-encoded version of the generated signature)
```

### Cookies (`/cookies.ts`)

This module provides a high-level API for managing cookies using `Headers` objects. It integrates `cookie-parser` and `cookie-serializer` for seamless handling of cookie reading, writing, signing, and deleting.

It assumes interaction with `Headers` objects, typically from incoming requests (`Cookie` header) or outgoing responses (`Set-Cookie` header).

#### `get`

Retrieves the value of a specific cookie from the `Cookie` or `Set-Cookie` header.

**Parameters:**

- `headers` (`Headers`): The `Headers` object containing the cookies.
- `name` (`string`): The name of the cookie to retrieve.
- `prefix` (`'secure' | 'host'`, optional): If specified, automatically adds the corresponding prefix (`__Secure-` or `__Host-`) to the `name` before looking it up.

**Returns:**

- (`string`): The decoded value of the cookie, or an empty string (`''`) if not found.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

// Assuming headers has 'Cookie: user=john; theme=dark; __Secure-pref=safe'
const headers = new Headers({
	Cookie: 'user=john; theme=dark; __Secure-pref=safe'
});

const user = cookies.get(headers, 'user');
console.log(user); // Output: 'john'

const preference = cookies.get(headers, 'pref', 'secure');
console.log(preference); // Output: 'safe'

const nonExistent = cookies.get(headers, 'nonExistent');
console.log(nonExistent); // Output: ''
```

#### `getAll`

Retrieves all cookies from the `Cookie` or `Set-Cookie` header as an object.

**Parameters:**

- `headers` (`Headers`): The `Headers` object containing the cookies.

**Returns:**

- (`Record<string, string>`): An object where keys are cookie names and values are their decoded values. Returns an empty object (`{}`) if no cookies are found.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

const headers = new Headers({
	Cookie: 'user=john; theme=dark; sessionToken=abc123xyz'
});

const allCookies = cookies.getAll(headers);
console.log(allCookies);
// Output: { user: 'john', theme: 'dark', sessionToken: 'abc123xyz' }

const emptyHeaders = new Headers();
const noCookies = cookies.getAll(emptyHeaders);
console.log(noCookies); // Output: {}
```

#### `getSigned`

Retrieves and verifies a specific signed cookie from the `Cookie` or `Set-Cookie` header.

**Parameters:**

- `headers` (`Headers`): The `Headers` object containing the cookies.
- `name` (`string`): The name of the signed cookie to retrieve (without the signature part).
- `secret` (`string | BufferSource`): The secret key used for verifying the signature.
- `prefix` (`'secure' | 'host'`, optional): If specified, automatically adds the corresponding prefix (`__Secure-` or `__Host-`) to the `name` before looking it up.

**Returns:**

- (`Promise<string | false>`): A promise resolving to the original cookie value if the signature is valid, or `false` if the cookie is not found, unsigned, or has an invalid signature.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

const secret = 'my-very-secret-key';

// Assume headers contain a valid signed cookie set previously:
// Set-Cookie: session=data.VALID_SIGNATURE; HttpOnly
const headers = new Headers({
	Cookie: 'session=data.VALID_SIGNATURE; other=plain' // Replace VALID_SIGNATURE
});

// (You'd need to generate a valid signature first to test this properly)
// Let's assume 'session=data.I9qAeGQOvWjCEJgRPmrw90JjYpnnX2C9zoOiGSxh1Ig%3D' is valid for 'secret ingredient'
const headersWithValidSigned = await cookies.setSigned(new Headers(), 'session', 'data', 'secret ingredient');

// Get valid signed cookie
const sessionData = await cookies.getSigned(headersWithValidSigned, 'session', 'secret ingredient');
console.log(sessionData); // Output: 'data'

// Get unsigned cookie (returns false)
const otherData = await cookies.getSigned(headersWithValidSigned, 'other', 'secret ingredient');
console.log(otherData); // Output: false

// Get with wrong secret (returns false)
const wrongSecretData = await cookies.getSigned(headersWithValidSigned, 'session', 'wrong-secret');
console.log(wrongSecretData); // Output: false
```

#### `getAllSigned`

Retrieves and verifies all signed cookies from the `Cookie` or `Set-Cookie` header.

**Parameters:**

- `headers` (`Headers`): The `Headers` object containing the cookies.
- `secret` (`string | BufferSource`): The secret key used for verifying signatures.

**Returns:**

- (`Promise<Record<string, string | false>>`): A promise resolving to an object containing all found signed cookies. Keys are cookie names. Values are the original value if the signature is valid, `false` otherwise. Unsigned cookies are ignored. Returns an empty object (`{}`) if no signed cookies are found.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

const secret = 'another-secret';

// Assume headers contain multiple cookies, some signed
let headers = new Headers();
headers = await cookies.setSigned(headers, 'user', 'admin', secret);
headers = await cookies.setSigned(headers, 'pref', 'light', secret);
headers = await cookies.set(headers, 'tracker', 'xyz'); // Unsigned

const signedCookies = await cookies.getAllSigned(headers, secret);
console.log(signedCookies);
// Output: { user: 'admin', pref: 'light' }
```

#### `set`

Sets a cookie by appending a `Set-Cookie` header. Returns a _new_ `Headers` object with the appended header.

**Parameters:**

- `headers` (`Headers`): The original `Headers` object.
- `name` (`string`): The name of the cookie.
- `value` (`string`): The value of the cookie.
- `options` (`CookieSerializer.Options`, optional): Cookie attributes (e.g., `maxAge`, `path`, `httpOnly`, `secure`, `sameSite`, `prefix`). Defaults `path` to `/`. Handles `prefix` option to set `__Secure-` or `__Host-` cookies with appropriate constraints.

**Returns:**

- (`Headers`): A new `Headers` object with the `Set-Cookie` header appended.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

let headers = new Headers();

// Set a simple cookie
headers = cookies.set(headers, 'theme', 'dark');
console.log(headers.get('set-cookie')); // Output: theme=dark; Path=/

// Set a cookie with options and prefix
headers = cookies.set(headers, 'session', 'xyz123', {
	httpOnly: true,
	maxAge: 3600,
	prefix: 'secure' // Will become __Secure-session and set secure=true
});
console.log(headers.get('set-cookie'));
// Output: theme=dark; Path=/, __Secure-session=xyz123; Max-Age=3600; Path=/; HttpOnly; Secure
```

#### `setSigned`

Sets a signed cookie by appending a `Set-Cookie` header. Generates the signature automatically. Returns a _new_ `Headers` object.

**Parameters:**

- `headers` (`Headers`): The original `Headers` object.
- `name` (`string`): The name of the cookie.
- `value` (`string`): The value to be signed and stored.
- `secret` (`string | BufferSource`): The secret key used for signing.
- `options` (`CookieSerializer.Options`, optional): Cookie attributes. Defaults `path` to `/`. Handles `prefix` option.

**Returns:**

- (`Promise<Headers>`): A promise resolving to a new `Headers` object with the signed `Set-Cookie` header appended.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

const secret = 'signing-key-shhh';
let headers = new Headers();

// Set a signed cookie
headers = await cookies.setSigned(headers, 'authToken', 'user-token-data', secret, {
	httpOnly: true,
	secure: true,
	maxAge: 86400 // 1 day
});

console.log(headers.get('set-cookie'));
// Output: authToken=user-token-data.VALID_SIGNATURE; Max-Age=86400; Path=/; HttpOnly; Secure
// (Where VALID_SIGNATURE is the generated signature)
```

#### `del`

Deletes a cookie by setting its `Max-Age` to 0 and `Expires` to a past date. Returns a _new_ `Headers` object.

**Parameters:**

- `headers` (`Headers`): The original `Headers` object.
- `name` (`string`): The name of the cookie to delete.
- `options` (`CookieSerializer.Options`, optional): Additional options like `path` and `domain` which _must match_ the original cookie's settings to ensure deletion. Defaults `path` to `/`.

**Returns:**

- (`Headers`): A new `Headers` object with the deleting `Set-Cookie` header appended. If the cookie wasn't found in the input `headers`, the original `headers` object is returned unmodified.

**Usage Example:**

```typescript
import cookies from 'use-request-utils/cookies';

// Assume headers has 'Cookie: user=john; session=abc'
let headers = new Headers({ Cookie: 'user=john; session=abc' });

// Delete the 'session' cookie
headers = cookies.del(headers, 'session', { path: '/' });

console.log(headers.get('set-cookie'));
// Output: session=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

### Cryptography Utilities (`/crypto.ts`)

Provides basic cryptographic hashing functions using the Web Crypto API (`crypto.subtle`).

#### Types

##### `Data`

```typescript
type Data = string | boolean | number | object | ArrayBufferView | ArrayBuffer | ReadableStream;
```

Represents the type of data that can be hashed. Objects are automatically stringified using `use-json`.

#### `sha1`

Computes the SHA-1 hash of the input data.

**Parameters:**

- `data` (`Data`): The data to hash.

**Returns:**

- (`Promise<string | null>`): A promise resolving to the SHA-1 hash as a lowercase hexadecimal string, or `null` if the Web Crypto API is unavailable.

**Usage Example:**

```typescript
import cryptoUtil from 'use-request-utils/crypto';

const text = 'rohde';
const hash = await cryptoUtil.sha1(text);
console.log(hash); // Output: '503f01750607b19c75b7815d7d5e9c221d48e4cc'

const buffer = new TextEncoder().encode(text).buffer;
const bufferHash = await cryptoUtil.sha1(buffer);
console.log(bufferHash); // Output: '503f01750607b19c75b7815d7d5e9c221d48e4cc'
```

#### `sha256`

Computes the SHA-256 hash of the input data.

**Parameters:**

- `data` (`Data`): The data to hash.

**Returns:**

- (`Promise<string | null>`): A promise resolving to the SHA-256 hash as a lowercase hexadecimal string, or `null` if the Web Crypto API is unavailable.

**Usage Example:**

```typescript
import cryptoUtil from 'use-request-utils/crypto';

const text = 'rohde';
const hash = await cryptoUtil.sha256(text);
console.log(hash); // Output: '1094ef31e36b77eac0a14db33f777e25a12857d4e23b3b8f395c5cb6c1a28d2a'

const obj = { key: 'value' };
const objHash = await cryptoUtil.sha256(obj);
console.log(objHash); // Output: hash of JSON.stringify(obj)

const buffer = new Uint8Array([1, 2, 3]);
const bufferHash = await cryptoUtil.sha256(buffer);
console.log(bufferHash); // Output: '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81'
```

### Ephemeral Cache (`/ephemeral-cache.ts`)

Provides a lightweight, time-aware, in-memory cache specifically designed for storing and retrieving `Response` objects. It includes features like automatic expiration (TTL), request deduplication for concurrent requests (`wrap`), and cache status headers.

A default instance is exported, but you can also create your own `EphemeralCache` instances.

#### `EphemeralCache` Class

##### Constructor

```typescript
new EphemeralCache(options?: { autoCleanExpired?: boolean })
```

Creates a new cache instance.

**Parameters:**

- `options.autoCleanExpired` (`boolean`, optional, default: `true`): If `true`, automatically sets up an interval (every 15 seconds) to clean expired cache items.

##### Methods

###### `get(key: string, ttlSeconds?: number): Response | null`

Retrieves a cached `Response` object by key.

- Returns `null` if the key is not found, the key is empty/whitespace, or the item has expired.
- Expiration is checked against the `ttlSeconds` provided during `set`, or the optional `ttlSeconds` argument passed to `get`.
- The returned `Response` is a _new_ instance containing the cached body and status, with added/updated headers:
  - `ephemeral-cache-status`: `HIT`
  - `ephemeral-cache-age`: Age of the cached item in seconds.
  - `ephemeral-cache-remaining-age`: Remaining TTL in seconds.
  - `ephemeral-cache-ts`: Original timestamp (milliseconds) when the item was cached.
  - `ephemeral-cache-ttl`: The effective TTL (in seconds) used for this `get` operation.

###### `set(key: string, response: Response, ttlSeconds?: number): Promise<void>`

Stores a `Response` object in the cache.

- The `key` is trimmed. Throws an error if the key is invalid (empty/whitespace).
- The `response.body` is read into an `ArrayBuffer` for storage. If `response.body` is null, the item is _not_ stored.
- `ttlSeconds` defaults to `0` (meaning it expires immediately unless a TTL is provided in `get`). The maximum effective TTL is capped at `15` seconds (`MAX_TTL_SECONDS`).
- Adds `ephemeral-cache-ts` and `ephemeral-cache-ttl` headers to the _stored_ headers.
- Removes any pending promise for the same key.

###### `wrap(key: string, fn: () => Promise<Response>, options: { refreshTtl?: boolean; ttlSeconds: number }): Promise<Response>`

A powerful method that attempts to retrieve a response from the cache. If missed or expired, it calls the provided function `fn` to generate a fresh response, caches it (if cacheable), and returns it. Handles concurrent requests for the same key, ensuring `fn` is called only once while pending.

- `key`: The cache key (trimmed). If empty/whitespace or `ttlSeconds <= 0`, caching is bypassed, and `fn` is called directly.
- `fn`: An async function that returns a `Promise<Response>`. Called only on cache miss or bypass.
- `options.ttlSeconds`: The TTL in seconds for caching the response from `fn`. Max 15 seconds.
- `options.refreshTtl` (`boolean`, default: `false`): If `true` and a cache hit occurs, the item's timestamp is updated, effectively resetting its TTL.
- **Caching Logic:**
  - Only responses with cacheable `content-type` headers (e.g., `application/json`, `text/*`, but not `*stream*`) and a non-null body are cached via `set`.
  - If a request for `key` is already in progress (pending promise), subsequent `wrap` calls for the same `key` will wait for the pending promise and return a _clone_ of its result.
  - Errors thrown by `fn` are propagated, and the pending promise is cleared.
- **Return Value:**
  - On cache HIT: Returns the cached `Response` with `ephemeral-cache-status: HIT` and age headers.
  - On cache MISS: Returns the `Response` generated by `fn`. If cached, the original response from `fn` is returned (not a clone from the cache `set` operation).

###### `has(key: string): boolean`

Checks if a non-expired item exists for the given key (ignores TTL override).

###### `delete(key: string): boolean`

Removes an item from the cache and any associated pending promise. Returns `true` if an item was deleted.

###### `clear(): void`

Removes all items from the cache and clears all pending promises.

###### `clearExpired(): void`

Removes only the items that have exceeded their original `ttlSeconds`.

###### `refreshTtl(key: string): void`

Updates the timestamp (`ts`) of an existing cached item to the current time, effectively resetting its TTL. Does nothing if the key doesn't exist.

###### `size(): number`

Returns the current number of items stored in the cache.

#### Default Export

```typescript
import ephemeralCache from 'use-request-utils/ephemeral-cache';
```

A pre-instantiated `EphemeralCache` instance with `autoCleanExpired: true`.

#### Usage Examples

```typescript
import ephemeralCache, { EphemeralCache } from 'use-request-utils/ephemeral-cache';
import headersUtil from 'use-request-utils/headers';

// --- Using the default instance ---

// Example: Caching a fetch response
async function fetchData(url: string): Promise<Response> {
	console.log('Fetching fresh data for:', url);
	return fetch(url);
}

const url = 'https://api.example.com/data';
const cacheKey = 'api-data';

// First call: fetches, caches, returns fresh response
const response1 = await ephemeralCache.wrap(cacheKey, () => fetchData(url), { ttlSeconds: 5 });
const data1 = await response1.json();
console.log('Data 1:', data1);
console.log('Response 1 Headers:', headersUtil.toJson(response1.headers));
// Output: Fetching fresh data for: https://api.example.com/data
// Output: Data 1: { ... }
// Output: Response 1 Headers: { content-type: 'application/json', ... }

await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

// Second call (within TTL): returns cached response
const response2 = await ephemeralCache.wrap(cacheKey, () => fetchData(url), { ttlSeconds: 5 });
const data2 = await response2.json();
console.log('Data 2:', data2);
console.log('Response 2 Headers:', headersUtil.toJson(response2.headers));
// Output: Data 2: { ... }
// Output: Response 2 Headers: { content-type: 'application/json', 'ephemeral-cache-status': 'HIT', 'ephemeral-cache-age': '1.xxx', ... }

await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 more seconds (total > 5s)

// Third call (after TTL): fetches again
const response3 = await ephemeralCache.wrap(cacheKey, () => fetchData(url), { ttlSeconds: 5 });
const data3 = await response3.json();
console.log('Data 3:', data3);
// Output: Fetching fresh data for: https://api.example.com/data
// Output: Data 3: { ... }

// --- Manual Caching ---
const manualResponse = new Response(JSON.stringify({ manual: true }), {
	headers: { 'content-type': 'application/json' }
});
await ephemeralCache.set('manual-key', manualResponse, 10); // Cache for 10 seconds

const cachedManual = ephemeralCache.get('manual-key');
if (cachedManual) {
	console.log('Manual Cache Hit:', await cachedManual.json());
	console.log('Manual Cache Headers:', headersUtil.toJson(cachedManual.headers));
	// Output: Manual Cache Hit: { manual: true }
	// Output: Manual Cache Headers: { ..., 'ephemeral-cache-status': 'HIT', ... }
}

// Check size
console.log('Cache size:', ephemeralCache.size());

// Delete item
ephemeralCache.delete('manual-key');
console.log('Has manual-key:', ephemeralCache.has('manual-key')); // Output: false

// Clear all
ephemeralCache.clear();
console.log('Cache size after clear:', ephemeralCache.size()); // Output: 0

// --- Using a separate instance ---
const myCache = new EphemeralCache({ autoCleanExpired: false });
// Use myCache.set, myCache.get, etc.
```

### Fetch Utilities (`/fetch.ts`)

Provides an enhanced `fetch` wrapper (`fetch.http`) that integrates with `ephemeral-cache` for automatic caching of GET/HEAD requests and standardizes error handling using `HttpError`. It also makes requests abortable.

#### `fetch.http`

The primary export is an `http` function object with multiple ways to be called, providing flexibility in how you receive the response. All variations return an abortable promise-like object.

##### Standard Call: `http<T>(info: RequestInfo, options?: HttpOptions): Abortable<Promise<T>>`

Fetches the resource and attempts to parse the response body.

- If the response `content-type` header includes `application/json`, the body is parsed as JSON.
- Otherwise, the raw body (likely a string) is returned.
- If the response status is not OK (e.g., 4xx, 5xx), it throws an `HttpError`. The error message attempts to use the response body, otherwise uses the standard status text.
- For `GET` and `HEAD` requests, it automatically uses `ephemeralCache.wrap` for caching (default TTL 1 second, refresh on hit).

**Parameters:**

- `info` (`RequestInfo`): URL string or a `Request` object.
- `options` (`HttpOptions`, optional): Options for the fetch call.

**Returns:**

- (`Abortable<Promise<T>>`): An object that is both a `Promise` resolving to the parsed body (`T`) and has an `abort()` method. Rejects with `HttpError` on network errors or non-OK responses.

##### `.asObject<T>(info: RequestInfo, options?: HttpOptions): Abortable<Promise<{ body: T; headers: Headers; status: number }>>`

Fetches the resource and returns a structured object containing the parsed body, headers, and status, _regardless_ of whether the request was successful (i.e., it does not throw for non-OK statuses).

- Body parsing follows the same logic as the standard call.
- Integrates with `ephemeralCache` similarly.

**Parameters:**

- `info` (`RequestInfo`): URL string or a `Request` object.
- `options` (`HttpOptions`, optional): Options for the fetch call.

**Returns:**

- (`Abortable<Promise<{ body: T; headers: Headers; status: number }>>`): An object that is both a `Promise` resolving to the structured response object and has an `abort()` method. Rejects with `HttpError` only on network errors or unhandled exceptions.

##### `.asResponse(info: RequestInfo, options?: HttpOptions): Abortable<Promise<Response>>`

Fetches the resource and returns the raw `Response` object.

- Does _not_ automatically parse the body or throw `HttpError` for non-OK statuses (you need to check `response.ok` yourself).
- Integrates with `ephemeralCache` similarly.

**Parameters:**

- `info` (`RequestInfo`): URL string or a `Request` object.
- `options` (`HttpOptions`, optional): Options for the fetch call.

**Returns:**

- (`Abortable<Promise<Response>>`): An object that is both a `Promise` resolving to the raw `Response` object and has an `abort()` method. Rejects with `HttpError` only on network errors or unhandled exceptions.

#### `HttpOptions` Class

A helper class used internally to manage options passed to `fetch.http`.

```typescript
class HttpOptions {
	public ephemeralCacheTtlSeconds: number; // Default: 1 second
	public init: RequestInit | null; // Standard fetch RequestInit options

	constructor(options?: { init?: RequestInit | null; ephemeralCacheTtlSeconds?: number });
}
```

**Properties:**

- `ephemeralCacheTtlSeconds`: The TTL (in seconds) to use for caching GET/HEAD requests via `ephemeralCache`. Defaults to `1`. Set to `0` or negative to disable caching for a specific call.
- `init`: Standard `fetch` options (`method`, `headers`, `body`, `signal`, etc.) to be merged with the request.

#### Aborting Requests

All variants of `fetch.http` return an object that includes an `abort()` method. Calling this method will abort the underlying fetch request using an `AbortController`. The promise will typically reject with an `HttpError` with status 499 and message 'Graceful Abort'.

```typescript
const request = fetch.http('https://api.example.com/long-running');

// Sometime later...
request.abort();

try {
	await request;
} catch (err) {
	if (err instanceof HttpError && err.status === 499) {
		console.log('Request was aborted successfully.');
	} else {
		console.error('Fetch failed:', err);
	}
}
```

#### Usage Examples

```typescript
import fetchUtil from 'use-request-utils/fetch';
import Request from 'use-request-utils/request'; // Assuming custom Request if needed
import HttpError from 'use-http-error';

// --- Standard Call (Get JSON) ---
try {
	const data = await fetchUtil.http<{ id: number; name: string }>('https://api.example.com/users/1');
	console.log('User data:', data);
} catch (err) {
	console.error('Failed to fetch user:', err instanceof HttpError ? err.toJson() : err);
}

// --- Standard Call (Get Text) ---
try {
	const text = await fetchUtil.http<string>('https://api.example.com/status.txt');
	console.log('Status:', text);
} catch (err) {
	console.error('Failed to fetch status:', err);
}

// --- Standard Call with Options (POST) ---
try {
	const response = await fetchUtil.http<{ success: boolean }>('https://api.example.com/users', {
		init: {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'New User' })
		},
		ephemeralCacheTtlSeconds: 0 // Disable cache for POST
	});
	console.log('Create user response:', response);
} catch (err) {
	console.error('Failed to create user:', err);
}

// --- Get as Object (Handles OK and non-OK responses) ---
const { body, headers, status } = await fetchUtil.http.asObject<{ data?: any; error?: string }>('https://api.example.com/maybe-error');
if (status === 200) {
	console.log('Success Body:', body);
} else {
	console.log(`Error ${status}:`, body);
	console.log('Error Headers:', headers);
}

// --- Get as Response (Manual Handling) ---
const response = await fetchUtil.http.asResponse('https://api.example.com/data');
if (response.ok) {
	const data = await response.json();
	console.log('Raw response success:', data);
} else {
	console.error(`Raw response failed with status ${response.status}`);
	const errorText = await response.text();
	console.error('Error body:', errorText);
}

// --- Caching Example ---
console.time('fetch1');
await fetchUtil.http('https://api.example.com/cached-resource');
console.timeEnd('fetch1'); // ~ Network time

await new Promise(r => setTimeout(r, 100)); // Wait briefly

console.time('fetch2');
await fetchUtil.http('https://api.example.com/cached-resource');
console.timeEnd('fetch2'); // ~ Should be much faster due to cache HIT

// --- Abort Example ---
const longRequest = fetchUtil.http('https://api.example.com/long-operation');
setTimeout(() => {
	console.log('Aborting request...');
	longRequest.abort();
}, 500);

try {
	await longRequest;
} catch (error) {
	if (error instanceof HttpError && error.status === 499) {
		console.log('Long request successfully aborted.');
	} else {
		console.error('Error during long request:', error);
	}
}
```

### JWT Utilities (`/jwt.ts`)

Provides functions for signing, verifying, and decoding JSON Web Tokens (JWTs) using the Web Crypto API. Supports standard algorithms (HS\*, RS\*, ES\*) and optional JWE-like encryption (AES-GCM).

#### Types

##### `Jwt.Algorithm`

```typescript
type Algorithm = 'ES256' | 'ES384' | 'ES512' | 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
```

Supported signing algorithms.

##### `Jwt.EncryptionEncoding`

```typescript
type EncryptionEncoding = 'A128GCM' | 'A192GCM' | 'A256GCM';
```

Supported encryption algorithms (used when `options.encrypt` is enabled).

##### `Jwt.Header<T>`

```typescript
type Header<T = any> = {
	alg?: Algorithm;
	type?: string; // Typically 'JWT'
} & T;
```

Represents the JWT header, allowing custom properties via `T`. `alg` and `type` are automatically managed.

##### `Jwt.Payload<T>`

```typescript
type Payload<T = { [key: string]: any }> = {
	iss?: string; // Issuer
	sub?: string; // Subject
	aud?: string | string[]; // Audience
	exp?: number; // Expiration Time (Unix timestamp in seconds)
	nbf?: number; // Not Before (Unix timestamp in seconds)
	iat?: number; // Issued At (Unix timestamp in seconds) - Automatically added during sign
	jti?: string; // JWT ID
} & T;
```

Represents the JWT payload, including standard registered claims and custom properties via `T`.

##### `Jwt.SignOptions<H>`

```typescript
type SignOptions<H> = {
	alg?: Algorithm | string; // Algorithm (default: 'HS256')
	encrypt?: boolean | { enc: EncryptionEncoding }; // Enable encryption (default: false). If true, uses 'A256GCM'.
	header?: Header<H>; // Custom header fields
};
```

Options for the `sign` function.

##### `Jwt.VerifyOptions`

```typescript
type VerifyOptions = {
	alg?: Algorithm | string; // Algorithm to expect (default: 'HS256')
	clockTolerance?: number; // Seconds to tolerate clock skew for 'exp' and 'nbf' checks (default: 0)
	decrypt?: boolean; // Decrypt the token before verification (default: false)
};
```

Options for the `verify` function.

##### `Jwt.Data<P, H>`

```typescript
type Data<P = any, H = any> = {
	header?: Header<H>;
	payload?: Payload<P>;
};
```

The structure returned by `decode` and `verify`, containing the parsed header and payload.

#### `sign`

Creates and signs a JWT. Can optionally encrypt the resulting JWS.

**Parameters:**

- `payload` (`Jwt.Payload<P>`): The payload object for the token. `iat` (Issued At) is added automatically.
- `secret` (`string | JsonWebKey | CryptoKey`): The secret or private key for signing. Can be a raw string (for HS\*), a JWK object, or a CryptoKey.
- `options` (`Jwt.SignOptions<H> | Jwt.Algorithm`, optional): Signing options or just the algorithm string. Defaults to `{ alg: 'HS256', header: { type: 'JWT' } }`.

**Returns:**

- (`Promise<string>`): A promise resolving to the signed (and optionally encrypted) JWT string.

**Throws:**

- `Error`: If the payload is not an object, the secret is invalid, the algorithm is unsupported, or cryptographic operations fail.

**Usage Example:**

```typescript
import jwt from 'use-request-utils/jwt';

const secret = 'super-secret-key';
const payload = { userId: 123, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour

// Sign with default HS256
const tokenHS256 = await jwt.sign(payload, secret);
console.log('HS256 Token:', tokenHS256);

// Sign with HS512
const tokenHS512 = await jwt.sign(payload, secret, 'HS512');
console.log('HS512 Token:', tokenHS512);

// Sign with custom header and encryption (A256GCM)
const tokenEncrypted = await jwt.sign(payload, secret, {
	alg: 'HS256',
	header: { kid: 'key-id-1' },
	encrypt: true // Enables encryption with default A256GCM
});
console.log('Encrypted Token:', tokenEncrypted);

// Sign with specific encryption encoding
const tokenEncryptedA128 = await jwt.sign(payload, secret, {
	alg: 'HS256',
	encrypt: { enc: 'A128GCM' }
});
console.log('A128GCM Encrypted Token:', tokenEncryptedA128);

// Example with RS256 (requires private key)
// const privateKey = await crypto.subtle.importKey(...); // Import your PKCS8 key
// const tokenRS256 = await jwt.sign(payload, privateKey, 'RS256');
```

#### `verify`

Verifies a JWT's signature and optionally decrypts it. Checks standard claims (`exp`, `nbf`) if present.

**Parameters:**

- `token` (`string`): The JWT string to verify.
- `secret` (`string | JsonWebKey | CryptoKey`): The secret or public key for verification.
- `options` (`Jwt.VerifyOptions | Jwt.Algorithm`, optional): Verification options or just the expected algorithm string. Defaults to `{ alg: 'HS256', clockTolerance: 0 }`.

**Returns:**

- (`Promise<Jwt.Data<P, H>>`): A promise resolving to an object containing the verified `header` and `payload`.

**Throws:**

- `Error`: If the token format is invalid (`'Token must consist of 3 parts'`).
- `Error`: If the algorithm is not found (`'Algorithm not found'`).
- `Error`: If the expected `alg` in options doesn't match the token's header `alg` (`'ALG_MISMATCH'`).
- `Error`: If the payload is missing or empty after decoding (`'INVALID_PAYLOAD'`).
- `Error`: If the `nbf` (Not Before) claim is in the future (considering `clockTolerance`) (`'NBF'`).
- `Error`: If the `exp` (Expiration Time) claim is in the past (considering `clockTolerance`) (`'EXP'`).
- `Error`: If the signature is invalid (`'INVALID_SIGNATURE'`).
- `Error`: If decryption fails (when `options.decrypt` is true).

**Usage Example:**

```typescript
import jwt from 'use-request-utils/jwt';

const secret = 'super-secret-key';
// Assume tokenHS256 and tokenEncrypted are valid tokens generated above

try {
	// Verify HS256 token
	const verifiedDataHS256 = await jwt.verify(tokenHS256, secret); // Defaults to HS256 check
	console.log('Verified HS256 Payload:', verifiedDataHS256.payload);

	// Verify HS512 token (must specify alg)
	// const verifiedDataHS512 = await jwt.verify(tokenHS512, secret, 'HS512');
	// console.log('Verified HS512 Payload:', verifiedDataHS512.payload);

	// Verify encrypted token (must specify decrypt: true and the original signing alg)
	const verifiedEncryptedData = await jwt.verify(tokenEncrypted, secret, {
		alg: 'HS256', // The signing algorithm inside the encrypted token
		decrypt: true
	});
	console.log('Verified Encrypted Payload:', verifiedEncryptedData.payload);
	console.log('Verified Encrypted Header:', verifiedEncryptedData.header); // Should contain { alg, typ }

	// Verify with clock tolerance
	const expiredToken = await jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, secret);
	try {
		await jwt.verify(expiredToken, secret);
	} catch (e) {
		console.log('Verification failed (expected):', e.message); // Output: EXP
	}
	const verifiedTolerant = await jwt.verify(expiredToken, secret, { clockTolerance: 15 });
	console.log('Verified with tolerance:', verifiedTolerant.payload); // Should succeed
} catch (error) {
	console.error('Verification failed:', error.message);
}

// Example with RS256 (requires public key corresponding to the private key used for signing)
// const publicKey = await crypto.subtle.importKey(...); // Import your SPKI key
// const verifiedDataRS256 = await jwt.verify(tokenRS256, publicKey, 'RS256');
```

#### `decode`

Decodes a JWT without verifying the signature. Useful for reading claims before verification or when verification is handled elsewhere.

**Parameters:**

- `token` (`string`): The JWT string to decode.

**Returns:**

- (`Jwt.Data<P, H>`): An object containing the decoded `header` and `payload`. Returns `undefined` for header or payload if decoding fails for that part.

**Usage Example:**

```typescript
import jwt from 'use-request-utils/jwt';

// Assume tokenHS256 is a valid token generated previously
const decodedData = jwt.decode(tokenHS256);

console.log('Decoded Header:', decodedData.header);
console.log('Decoded Payload:', decodedData.payload);

// Decoding an invalid token part might result in undefined
const invalidToken = 'invalidPart1.invalidPart2.invalidPart3';
const decodedInvalid = jwt.decode(invalidToken);
console.log('Decoded Invalid:', decodedInvalid); // Output: { header: undefined, payload: undefined }
```

### Map Store (`/map-store.ts`)

A general-purpose, Map-based key-value store with support for scoping data as `public` or `private`. Useful for managing state within request lifecycles or other contexts where selective serialization is needed.

Only serializable values (string, number, boolean, null, plain object, array) can be stored.

#### Constructor

```typescript
new MapStore(init?: Record<string, any>, defaultScope?: MapStore.Scope)
```

Creates a new `MapStore` instance.

**Parameters:**

- `init` (`Record<string, any>`, optional): An initial set of key-value pairs to populate the store.
- `defaultScope` (`MapStore.Scope`, optional, default: `'private'`): The scope assigned to values added via `init` or `set` without an explicit scope.

#### Methods

##### `get<T>(key: string): T | null`

##### `get<T>(key: string, defaultValue: T): T`

Retrieves the value associated with a key.

**Parameters:**

- `key` (`string`): The key of the value to retrieve.
- `defaultValue` (`T`, optional): A value to return if the key is not found.

**Returns:**

- (`T | null`): The stored value, the `defaultValue` if provided and the key is not found, or `null` if the key is not found and no `defaultValue` is provided. Scope is ignored when getting values.

##### `set(key: string, value: any, scope?: MapStore.Scope): void`

Sets a value associated with a key, optionally specifying its scope.

**Parameters:**

- `key` (`string`): The key to set.
- `value` (`any`): The value to store. Must be serializable (string, number, boolean, null, plain object, or array).
- `scope` (`MapStore.Scope`, optional): The scope (`'public'` or `'private'`) for the value. Defaults to the `defaultScope` set in the constructor (which defaults to `'private'`).

**Throws:**

- `Error`: If `value` is not a serializable type.

##### `update<T = any>(key: string, fn: (value: T | null) => T, scope?: MapStore.Scope): void`

Updates the value associated with a key using a function. If the key doesn't exist, `null` is passed to the function.

**Parameters:**

- `key` (`string`): The key to update.
- `fn` (`(value: T | null) => T`): A function that receives the current value (or `null`) and returns the new value to be stored.
- `scope` (`MapStore.Scope`, optional): If provided, sets the scope of the updated value. If omitted, the existing scope is maintained, or the `defaultScope` is used if the key is new.

##### `delete(key: string): void`

Removes a key and its associated value from the store.

**Parameters:**

- `key` (`string`): The key to delete.

##### `size(scope?: MapStore.Scope): number`

Returns the number of items in the store.

**Parameters:**

- `scope` (`MapStore.Scope`, optional): If provided, returns the count of items within that specific scope (`'public'` or `'private'`). If omitted, returns the total number of items in the store.

##### `toJson(scope?: 'public' | 'private' | 'all'): Record<string, any>`

Serializes the store's data into a plain JavaScript object, filtered by scope.

**Parameters:**

- `scope` (`'public' | 'private' | 'all'`, optional, default: `'public'`):
  - `'public'`: Returns only items with public scope.
  - `'private'`: Returns only items with private scope.
  - `'all'`: Returns all items regardless of scope.

**Returns:**

- (`Record<string, any>`): A plain object containing the key-value pairs matching the specified scope.

#### Usage Examples

```typescript
import MapStore from 'use-request-utils/map-store';

// Initialize with some private data
const store = new MapStore({ user: { id: 1, name: 'Alice' } }); // Default scope is private

// Set public and private data
store.set('sessionId', 'abc123xyz', 'public');
store.set('internalCounter', 0); // Uses default private scope

// Get values
console.log(store.get('user')); // Output: { id: 1, name: 'Alice' }
console.log(store.get('sessionId')); // Output: 'abc123xyz'
console.log(store.get('nonExistent', 'default')); // Output: 'default'

// Update values
store.update<number>('internalCounter', count => (count ?? 0) + 1);
console.log(store.get('internalCounter')); // Output: 1

// Update and change scope
store.update('user', user => ({ ...user, role: 'admin' }), 'public');

// Check sizes
console.log('Total size:', store.size()); // Output: 3
console.log('Public size:', store.size('public')); // Output: 2 (sessionId, user)
console.log('Private size:', store.size('private')); // Output: 1 (internalCounter)

// Serialize to JSON based on scope
console.log('Public JSON:', store.toJson('public'));
// Output: { sessionId: 'abc123xyz', user: { id: 1, name: 'Alice', role: 'admin' } }

console.log('Private JSON:', store.toJson('private'));
// Output: { internalCounter: 1 }

console.log('All JSON:', store.toJson('all'));
// Output: { user: { id: 1, name: 'Alice', role: 'admin' }, sessionId: 'abc123xyz', internalCounter: 1 }

// Delete a key
store.delete('internalCounter');
console.log('Total size after delete:', store.size()); // Output: 2
```

### Request Builder (`/request-builder.ts`)

A utility function for easily constructing standard `Request` objects, simplifying the process of setting methods, URLs, query parameters, headers, cookies, and various body types (JSON, FormData, raw).

#### `requestBuilder` Function

```typescript
requestBuilder(input: string, options?: RequestBuilder.Options): Request
```

**Parameters:**

- `input` (`string`): The URL for the request.
- `options` (`RequestBuilder.Options`, optional): Configuration options for the request.

**Returns:**

- (`Request`): A standard `Request` object configured according to the input and options.

##### `RequestBuilder.Options` Type

```typescript
type Options = {
	body?: BodyInit | Record<string, unknown>; // Raw body or JSON object
	cookies?: Record<string, string>; // Cookies to add as 'Cookie' header
	form?: FormData | Record<string, string | string[]>; // FormData or object to convert
	headers?: HeadersInit | null | undefined; // Request headers
	json?: Record<string, unknown>; // JSON body (sets Content-Type)
	method?: string; // HTTP method (default: 'GET')
	query?: Record<string, string | string[]>; // URL query parameters
	signal?: AbortSignal; // AbortSignal for cancellation
};
```

- `body`: Sets the request body. Can be standard `BodyInit` types (string, Blob, BufferSource, FormData, URLSearchParams, ReadableStream) or a plain object (which will be JSON-stringified and `Content-Type: application/json` header set, unless `form` or `json` option is also used). If `form` or `json` is set, `body` takes precedence if provided.
- `cookies`: A record of cookie names and values. These are serialized into a `Cookie` header string (using basic `cookieSerializer.serialize` with `path=/`) and added to the request headers.
- `form`: Sets the request body to `FormData`. Can be an existing `FormData` instance or a plain object. If an object is provided, it's converted to `FormData`, handling array values by appending multiple entries for the same key. Automatically sets the appropriate `Content-Type` header (usually omitted, letting the browser set it with the boundary). Overrides `json`. If `body` is also set, `body` takes precedence.
- `headers`: Standard `HeadersInit` (Headers object, plain object, or array of pairs) to set request headers. Merged with headers set automatically by `json`, `form`, or `cookies`.
- `json`: Sets the request body by JSON-stringifying the provided object. Automatically sets the `Content-Type: application/json` header. Overridden by `form` and `body`.
- `method`: The HTTP request method (e.g., 'GET', 'POST', 'PUT'). Defaults to 'GET'. The body is only included for methods other than 'GET', 'HEAD', 'OPTIONS'.
- `query`: A record of query parameters. Keys are parameter names, values are strings or arrays of strings. Appended to the `input` URL.
- `signal`: An `AbortSignal` to allow cancelling the request.

#### Usage Examples

```typescript
import requestBuilder from 'use-request-utils/request-builder';

// 1. GET request with query parameters
const getReq = requestBuilder('https://api.example.com/items', {
	query: {
		page: '2',
		sortBy: 'price',
		tags: ['featured', 'sale'] // Array values become multiple params
	}
});
console.log(getReq.url);
// Output: https://api.example.com/items?page=2&sortBy=price&tags=featured&tags=sale
console.log(getReq.method); // Output: GET

// 2. POST request with JSON body
const postJsonReq = requestBuilder('https://api.example.com/users', {
	method: 'POST',
	json: { name: 'Alice', email: 'alice@example.com' }
});
console.log(postJsonReq.method); // Output: POST
console.log(postJsonReq.headers.get('content-type')); // Output: application/json
// console.log(await postJsonReq.text()); // Output: {"name":"Alice","email":"alice@example.com"}

// 3. POST request with FormData (from object)
const postFormReq = requestBuilder('https://api.example.com/upload', {
	method: 'POST',
	form: {
		description: 'User profile picture',
		tags: ['profile', 'avatar']
		// file: new File(...) // Usually you'd use a File object here in browser
	}
});
console.log(postFormReq.method); // Output: POST
// Content-Type header will be set by fetch/browser with boundary
// const formData = await postFormReq.formData();
// console.log(formData.get('description')); // Output: User profile picture
// console.log(formData.getAll('tags'));   // Output: ['profile', 'avatar']

// 4. Request with custom headers and cookies
const secureReq = requestBuilder('https://api.example.com/profile', {
	method: 'GET',
	headers: {
		'X-API-Key': 'mysecretkey',
		Accept: 'application/vnd.api+json'
	},
	cookies: {
		sessionToken: 'abc123xyz',
		userId: 'user-42'
	}
});
console.log(secureReq.headers.get('X-API-Key')); // Output: mysecretkey
console.log(secureReq.headers.get('cookie'));
// Output: sessionToken=abc123xyz; Path=/; userId=user-42; Path=/

// 5. Using the 'body' option directly (e.g., for plain text or pre-formatted data)
const putReq = requestBuilder('https://api.example.com/config.txt', {
	method: 'PUT',
	body: 'Setting=Value\nAnother=Option',
	headers: { 'Content-Type': 'text/plain' } // Explicitly set Content-Type if needed
});
console.log(putReq.method); // Output: PUT
// console.log(await putReq.text()); // Output: Setting=Value\nAnother=Option

// 6. Using AbortSignal
const controller = new AbortController();
const abortableReq = requestBuilder('https://api.example.com/long-poll', {
	signal: controller.signal
});
// controller.abort(); // Call this to cancel the request
```

### Custom Request Class (`/request.ts`)

Extends the standard `Request` class to include Cloudflare-specific properties, specifically the `cf` object.

#### `CustomRequest` Class

This class behaves identically to the standard `Request` but adds a `cf` property.

##### Constructor

```typescript
new CustomRequest(
  input: RequestInfo | URL,
  init?: RequestInit & {
    cf?: CfProperties; // Cloudflare properties object
  }
)
```

Creates a new `CustomRequest` instance.

**Parameters:**

- `input`: Same as the standard `Request` constructor (URL string or Request object).
- `init`: Same as the standard `Request` constructor, but can optionally include a `cf` property.

**Properties:**

- Inherits all properties and methods from the standard `Request`.
- `cf` (`CfProperties`): Contains Cloudflare-specific request properties (like geo-location, TLS version, etc.). Defaults to an empty object (`{}`) if not provided in `init`.

#### Usage Example

This class is typically used internally by frameworks or utilities running in a Cloudflare Workers environment where the `cf` object is available on the incoming request.

```typescript
// In a Cloudflare Worker environment:
// Assuming 'incomingRequest' is the Request object passed to the fetch handler

import CustomRequest from 'use-request-utils/request';
import type { CfProperties } from '@cloudflare/workers-types';

// Example of how it might be instantiated internally
const cfProps: CfProperties = {
  // Example Cloudflare properties
  country: 'US',
  colo: 'LAX',
  tlsVersion: 'TLSv1.3',
  // ... other properties
};

const customReq = new CustomRequest(incomingRequest.url, {
    method: incomingRequest.method,
    headers: incomingRequest.headers,
    body: incomingRequest.body,
    cf: cfProps // Pass the cf object during instantiation
});

// Accessing the cf property
console.log('Request country:', customReq.cf.country); // Output: US
console.log('Request colo:', customReq.cf.colo);     // Output: LAX

// Can be used like a regular Request object
fetch(customReq).then(...);
```

### Router (`/router.ts`)

A fast and flexible request router implementation based on path matching. It supports static paths, path parameters (including optional and regex-constrained parameters), wildcards, and different HTTP methods.

#### `Router<T>` Class

##### Constructor

```typescript
new Router<T>();
```

Creates a new router instance. The type parameter `T` defines the type of the handler associated with each route (e.g., a function, an object, a string identifier).

##### Properties

- `routes` (`Router.Route<T>[]`): An array containing the registered route objects.

##### Methods

###### `add(method: string, path: string, handler: T): void`

Adds a new route to the router.

- `method` (`string`): The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE', 'ALL'). 'ALL' matches any method.
- `path` (`string`): The URL path pattern for the route. Leading/trailing slashes are normalized.
  - **Static:** `/users`, `/about/contact`
  - **Parameter:** `/users/:id`, `/posts/:category/:slug`
  - **Optional Parameter:** `/products/:category?` (Must be the last segment)
  - **Regex Parameter:** `/files/:filename{[a-z]+\\.(?:png|jpg)}`, `/users/:id{\\d+}`
  - **Wildcard:** `*`, `/*`, `/files/*`
- `handler` (`T`): The handler associated with this route (its type is defined by the generic `T`).

###### `match(method: string, path: string): Router.Response<T>[]`

Finds all routes that match the given HTTP method and path.

- `method` (`string`): The HTTP method of the incoming request.
- `path` (`string`): The path of the incoming request (e.g., `/users/123`).

**Returns:** (`Router.Response<T>[]`) An array of matching route objects. Each object has:

- `handler` (`T`): The handler registered for the matched route.
- `pathParams` (`Record<string, unknown>`): An object containing extracted path parameters. Parameter values are automatically inferred to the correct type (number, boolean, string). For non-parameter routes, this is an empty object.
- `rawPath` (`string`): The original path pattern string used when adding the route (useful for identifying which rule matched, especially with optional parameters).

**Throws:**

- `Error`: If a route pattern contains both a wildcard (`*`) and a labeled parameter (`:name`) within the same path segment (e.g., `/entry/:id/*`), as this is ambiguous.

#### Path Parameter Details

- **Basic Parameter:** `:name` (e.g., `/users/:id`) - Matches any characters until the next `/` or the end of the path.
- **Optional Parameter:** `:name?` (e.g., `/search/:query?`) - Makes the parameter optional. Must be the last segment of the path. Matches both `/search` and `/search/term`.
- **Regex Parameter:** `:name{pattern}` (e.g., `/users/:id{\\d+}`) - Matches the parameter only if it conforms to the provided JavaScript regular expression `pattern`. The pattern should _not_ include start/end anchors (`^`, `$`) or flags.
- **Type Inference:** Matched parameter values are automatically converted:
  - Strings matching `'true'` or `'false'` become booleans.
  - Strings containing only digits become numbers.
  - Otherwise, they remain strings.

#### Usage Examples

```typescript
import Router from 'use-request-utils/router';

// Define handler types (e.g., functions)
type HandlerFunction = (params: Record<string, unknown>) => string;

const handleUsers: HandlerFunction = params => `Users list`;
const handleUserById: HandlerFunction = params => `User details for ID: ${params.id} (Type: ${typeof params.id})`;
const handleUserAction: HandlerFunction = params => `Action '${params.action}' for user ID: ${params.id}`;
const handleProducts: HandlerFunction = params => `Products ${params.category ? 'in category ' + params.category : 'overview'}`;
const handleSitemap: HandlerFunction = params => `Sitemap XML`;
const handleCatchAll: HandlerFunction = params => `404 Not Found`;

// Create router instance
const router = new Router<HandlerFunction>();

// Add routes
router.add('ALL', '*', handleCatchAll); // Catch-all should often be added first or last depending on desired priority
router.add('GET', '/users', handleUsers);
router.add('GET', '/users/:id{\\d+}', handleUserById); // ID must be numeric
router.add('POST', '/users/:id/action/:action{[a-z]+}', handleUserAction); // Action must be letters
router.add('GET', '/products/:category?', handleProducts); // Optional category
router.add('GET', '/sitemap.xml', handleSitemap);

// --- Matching ---

// Match: GET /users
let matches = router.match('GET', '/users');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', 'Users list'] (Catch-all and specific)

// Match: GET /users/123
matches = router.match('GET', '/users/123');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', 'User details for ID: 123 (Type: number)']

// Match: GET /users/abc (fails numeric constraint)
matches = router.match('GET', '/users/abc');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found']

// Match: POST /users/456/action/edit
matches = router.match('POST', '/users/456/action/edit');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', "Action 'edit' for user ID: 456"]

// Match: POST /users/456/action/EDIT (fails action constraint)
matches = router.match('POST', '/users/456/action/EDIT');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found']

// Match: GET /products
matches = router.match('GET', '/products');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', 'Products overview']

// Match: GET /products/electronics
matches = router.match('GET', '/products/electronics');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', 'Products in category electronics']

// Match: GET /sitemap.xml
matches = router.match('GET', '/sitemap.xml');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found', 'Sitemap XML']

// Match: GET /nonexistent
matches = router.match('GET', '/nonexistent');
console.log(matches.map(m => m.handler(m.pathParams))); // Output: ['404 Not Found']
```

### General Utilities (`/util.ts`)

A collection of miscellaneous helper functions used across the library.

#### `parseDate`

Converts various inputs into a `Date` object representing a future time relative to now, or returns the input if it's already a `Date`.

**Parameters:**

- `input` (`Date | { days?: number; hours?: number; minutes?: number }`):
  - If a `Date` object, it's returned directly.
  - If an object with `days`, `hours`, or `minutes`, calculates a future date by adding the specified duration to the current time.
  - Otherwise (e.g., invalid input), returns the current `Date`.

**Returns:**

- (`Date`): The calculated or input `Date` object.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

const specificDate = new Date('2025-01-01T00:00:00Z');
console.log(util.parseDate(specificDate)); // Output: Date object for 2025-01-01

const futureDate = util.parseDate({ days: 1, hours: 12 });
console.log(futureDate); // Output: Date object 1 day and 12 hours from now

const now = util.parseDate({});
console.log(now); // Output: Date object representing the current time
```

#### `pathJoin`

Joins multiple path segments into a single path string, separated by forward slashes (`/`). Automatically trims leading/trailing slashes from each segment before joining. Filters out empty segments.

**Parameters:**

- `...args` (`string[]`): The path segments to join.

**Returns:**

- (`string`): The combined path string.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

const path1 = util.pathJoin('api', 'v1', 'users');
console.log(path1); // Output: 'api/v1/users'

const path2 = util.pathJoin('/api/', '/v1/', '/users/');
console.log(path2); // Output: 'api/v1/users'

const path3 = util.pathJoin('/api', '', 'v1', 'users'); // Empty segment is ignored
console.log(path3); // Output: 'api/v1/users'
```

#### `readStream`

Reads an entire `ReadableStream` and concatenates its chunks into a single string.

**Parameters:**

- `stream` (`ReadableStream | null`): The stream to read. If `null`, returns an empty string.
- `onRead` (`(chunk: Uint8Array, decoded: string) => void`, optional): A callback function executed for each chunk read from the stream. Receives the raw `Uint8Array` chunk and its decoded string representation.

**Returns:**

- (`Promise<string>`): A promise resolving to the full string content of the stream.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

// Create a sample stream
const stream = new ReadableStream({
	start(controller) {
		controller.enqueue(new TextEncoder().encode('Hello, '));
		controller.enqueue(new TextEncoder().encode('world!'));
		controller.close();
	}
});

// Read the stream
const content = await util.readStream(stream, (chunk, decoded) => {
	console.log(`Read chunk: ${decoded}`);
});
// Output: Read chunk: Hello,
// Output: Read chunk: world!

console.log('Full content:', content); // Output: Full content: Hello, world!
```

#### `readStreamToArrayBuffer`

Reads an entire `ReadableStream` and concatenates its `Uint8Array` chunks into a single `ArrayBuffer`.

**Parameters:**

- `stream` (`ReadableStream`): The stream to read.

**Returns:**

- (`Promise<ArrayBuffer>`): A promise resolving to the `ArrayBuffer` containing the stream's data.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

const stream = new ReadableStream({
	start(controller) {
		controller.enqueue(new Uint8Array([1, 2]));
		controller.enqueue(new Uint8Array([3, 4]));
		controller.close();
	}
});

const buffer = await util.readStreamToArrayBuffer(stream);
console.log(buffer.byteLength); // Output: 4
console.log(new Uint8Array(buffer)); // Output: Uint8Array(4) [ 1, 2, 3, 4 ]
```

#### `stringHash`

Generates a non-cryptographic hash code (string) for a given input string. Useful for creating relatively unique keys from string inputs (e.g., for caching). Uses a simple algorithm based on `Math.imul`.

**Parameters:**

- `str` (`string`): The input string.

**Returns:**

- (`string`): A hash string derived from the input.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

const hash1 = util.stringHash('Hello World');
console.log(hash1); // Example output: 'm3o6763j27d3'

const hash2 = util.stringHash('Another String');
console.log(hash2); // Example output: 'p11213b578b1'

const hash3 = util.stringHash('Hello World');
console.log(hash3); // Output: 'm3o6763j27d3' (Same as hash1)
```

#### `stringToStream`

Converts one or more strings into a `ReadableStream`. Each string becomes a chunk in the stream.

**Parameters:**

- `...str` (`string[]`): The strings to enqueue in the stream.

**Returns:**

- (`ReadableStream`): A stream that will yield the encoded strings.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

const stream = util.stringToStream('First part. ', 'Second part.');
// const content = await util.readStream(stream);
// console.log(content); // Output: First part. Second part.
```

#### `stringToStreamWithDelay`

Converts one or more strings into a `ReadableStream`, introducing a specified delay _between_ enqueuing each string chunk.

**Parameters:**

- `delay` (`number`, default: `0`): The delay in milliseconds between chunks.
- `...str` (`string[]`): The strings to enqueue in the stream.

**Returns:**

- (`ReadableStream`): A stream that will yield the encoded strings with delays.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

console.log('Starting stream...');
const stream = util.stringToStreamWithDelay(1000, 'Chunk 1...', 'Chunk 2...', 'Done.');

await util.readStream(stream, (chunk, decoded) => {
	console.log(new Date().toLocaleTimeString(), 'Received:', decoded);
});
console.log('Stream finished.');
// Output (with ~1s delays):
// Starting stream...
// [Time] Received: Chunk 1...
// [Time+1s] Received: Chunk 2...
// [Time+2s] Received: Done.
// Stream finished.
```

#### `wait`

Returns a promise that resolves after a specified number of milliseconds. Simple async delay utility.

**Parameters:**

- `ms` (`number`): The number of milliseconds to wait.

**Returns:**

- (`Promise<void>`): A promise that resolves when the timer completes.

**Usage Example:**

```typescript
import util from 'use-request-utils/util';

async function delayedAction() {
	console.log('Starting...');
	await util.wait(1500); // Wait for 1.5 seconds
	console.log('...Finished waiting!');
}

delayedAction();
```

---

## RPC (Remote Procedure Call) Modules

### RPC Context (`/rpc-context.ts`)

A class extending `MapStore` designed to hold contextual information during the lifecycle of an RPC (Remote Procedure Call). It provides access to request details like body, headers, and Cloudflare properties, and allows setting default response metadata.

Data stored using `set` defaults to `public` scope, meaning it will be included if the context itself is serialized (e.g., for debugging).

#### `RpcContext` Class

Inherits all methods from `MapStore` (`get`, `set`, `delete`, `update`, `size`, `toJson`).

##### Constructor

```typescript
new RpcContext(options: RpcContext.Options)
```

Creates a new `RpcContext` instance.

**Parameters:**

- `options` (`RpcContext.Options`): An object containing initial request details.
  - `body` (`ReadableStream | null`): The request body stream.
  - `cf` (`CfProperties`): Cloudflare-specific request properties (from the environment).
  - `headers` (`Headers`): The request headers.

##### Properties

- `body` (`ReadableStream | null`): The request body stream, if any.
- `cf` (`CfProperties`): Cloudflare-specific request properties.
- `headers` (`Headers`): The request headers.
- `defaultResponseMeta` (`{ headers: Headers; status: number }`): An object holding default headers and status code intended for the RPC response. Initialized with empty Headers and status 0. These can be overridden by the RPC method itself.

##### Methods

(In addition to `MapStore` methods)

###### `setDefaultResponseHeaders(headers: Headers): void`

Sets the default headers to be used for the response if not overridden by the RPC method.

###### `setDefaultResponseStatus(status: number): void`

Sets the default HTTP status code for the response if not overridden by the RPC method.

###### `toJson(): Record<string, any>`

Overrides `MapStore.toJson`. Returns a serializable object representing the context, including `cf`, `headers` (as a plain object), and any data set on the context (using the `'public'` scope from the underlying `MapStore`).

#### Usage Example

This class is primarily used internally by the `Rpc` base class. RPC methods access the context via `this.context`.

```typescript
import Rpc from 'use-request-utils/rpc';
import RpcResponse from 'use-request-utils/rpc-response';
import RpcContext from 'use-request-utils/rpc-context'; // Usually not needed directly

class MyRpc extends Rpc {
	async getUserData(userId: number): Promise<{ user: any; location: string | undefined }> {
		// Access context via this.context
		const context: RpcContext = this.context;

		// Get data from request context (assuming it was set by a middleware/hook)
		const authToken = context.get('authToken');
		console.log('Auth Token:', authToken);

		// Access Cloudflare properties
		const country = context.cf.country;
		console.log('Request from country:', country);

		// Access request headers
		const userAgent = context.headers.get('user-agent');
		console.log('User Agent:', userAgent);

		// Set default response metadata (can be overridden)
		context.setDefaultResponseStatus(201);
		context.setDefaultResponseHeaders(new Headers({ 'X-Default-Header': 'DefaultValue' }));

		// Simulate fetching user data
		const user = { id: userId, name: 'Example User' };

		// Store something else in the context (public by default)
		context.set('userDataFetched', true);

		// Optionally return a RpcResponse to override defaults
		// return this.createResponse({ user, location: country }, { status: 200 });

		// If returning plain object, defaultResponseMeta applies
		return { user, location: country };
	}

	async processData(): Promise<{ processed: boolean }> {
		// Access request body
		if (this.context.body) {
			// Note: A helper like util.readStream might be needed here
			// const rawBody = await util.readStream(this.context.body);
			// console.log('Received body:', rawBody);
			// Process body...
		}
		return { processed: true };
	}

	// Example hook using context
	async $onBeforeRequest(rpc, req) {
		const token = req.headers.get('Authorization')?.split(' ')[1];
		if (token) {
			this.context.set('authToken', token); // Store extracted token in context
		}
	}
}

// How the context might be used when handling a request (simplified):
// const rpcInstance = new MyRpc();
// const request = new Request(...); // Incoming HTTP request
// const rpcPayload = ... // Parsed RPC payload { resource, args }
// const response = await rpcInstance.fetch(rpcPayload, request);
```

### RPC Response (`/rpc-response.ts`)

A custom class extending the standard `Response` specifically designed for use within the RPC framework. It automatically handles serialization for common JavaScript types (objects, arrays, booleans, numbers, null) into JSON responses and sets appropriate `Content-Type` headers. It also carries an optional `cache` property used by the `Rpc` base class for caching directives.

#### `RpcResponse<T>` Class

Inherits all properties and methods from the standard `Response`.

##### Constructor

```typescript
new RpcResponse<T = unknown>(body?: unknown, init?: Rpc.ResponseInit)
```

Creates a new `RpcResponse` instance.

**Parameters:**

- `body` (`unknown`, optional): The response body.
  - If `null`, `boolean`, `number`, plain object (`{}`), or array (`[]`), it's automatically `JSON.stringify`-ed, and `Content-Type` is set to `application/json` (if not already set in `init.headers`).
  - If `ReadableStream`, `Content-Type` defaults to `application/octet-stream`.
  - If `FormData`, `Content-Type` defaults to `multipart/form-data`.
  - If `string`, `Content-Type` defaults to `text/plain;charset=UTF-8`.
  - If `undefined` or omitted, the body is `null`.
  - Other `BodyInit` types (Blob, BufferSource, URLSearchParams) are passed through.
- `init` (`Rpc.ResponseInit`, optional): Options for the response.
  - `cache` (`Rpc.CacheOptions`, optional, default: `false`): Caching directives for the `Rpc` base class. Can be `true` (use default TTL), `false` (do not cache), or an object `{ tags?: string[], ttlSeconds?: number }`.
  - `headers` (`HeadersInit`, optional): Headers for the response. `Content-Type` is set automatically based on `body` type if not provided.
  - `status` (`number`, optional, default: `200`): The HTTP status code.

##### Properties

- Inherits all properties from `Response` (`ok`, `status`, `statusText`, `headers`, `body`, `bodyUsed`, `redirected`, `type`, `url`).
- `cache` (`Rpc.CacheOptions`): The caching directive specified during construction.

##### Methods

- Inherits standard `Response` methods (`clone`, `arrayBuffer`, `blob`, `formData`, `text`).
- `json<J = T>(): Promise<J>`: Overrides the standard `json` method to provide better typing based on the generic `T`.
- `addDefaultHeaders(headers: Headers): void`: Merges default headers into the response's headers, _without_ overriding existing ones. Used internally by the `Rpc` class.

#### Usage Examples

This class is primarily instantiated within RPC methods using `this.createResponse(body, init)`.

```typescript
import Rpc from 'use-request-utils/rpc';
import RpcResponse from 'use-request-utils/rpc-response'; // Usually created via this.createResponse

class MyRpc extends Rpc {
	getData(): RpcResponse<{ success: boolean; data: number[] }> {
		// Create a JSON response with caching enabled (default TTL)
		return this.createResponse({ success: true, data: [1, 2, 3] }, { cache: true, status: 200 });
	}

	getPlainText(): RpcResponse<string> {
		// Create a plain text response with custom TTL and headers
		return this.createResponse('Operation successful.', {
			cache: { ttlSeconds: 300 }, // Cache for 5 minutes
			headers: new Headers({ 'X-Custom': 'Value' }),
			status: 201
		});
	}

	getStream(): RpcResponse<ReadableStream> {
		// Create a streaming response (not typically cached by default RPC logic)
		const stream = new ReadableStream({
			/* ... stream logic ... */
		});
		return this.createResponse(stream, {
			headers: new Headers({ 'Content-Type': 'text/event-stream' })
		});
	}

	getNullResponse(): RpcResponse<null> {
		// Create a response with a null body (serialized as JSON 'null')
		return this.createResponse(null, { status: 204 });
	}
}

// --- Direct Instantiation (Less Common) ---
const response = new RpcResponse({ message: 'Hello' }, { status: 201 });
console.log(response.status); // Output: 201
console.log(response.headers.get('content-type')); // Output: application/json
// console.log(await response.json()); // Output: { message: 'Hello' }
console.log(response.cache); // Output: false

const cachedResponse = new RpcResponse('Cached text', {
	cache: { tags: ['tag1'], ttlSeconds: 60 },
	headers: { 'X-My-Header': 'abc' }
});
console.log(cachedResponse.cache); // Output: { tags: ['tag1'], ttlSeconds: 60 }
console.log(cachedResponse.headers.get('content-type')); // Output: text/plain;charset=UTF-8
```

### RPC Base Class (`/rpc.ts`)

The foundation for creating RPC (Remote Procedure Call) services. Extend this class to define resources (methods) that can be called remotely. It handles request parsing, routing to methods, context management, response creation, error handling, and optional caching.

#### `Rpc` Class

##### Constructor

```typescript
new Rpc();
```

Creates a new RPC service instance. All configuration (caching, error handling, default headers) is done through static methods.

##### Static Properties and Methods

###### Static Properties

- `cache` (`Rpc.CacheInterface | null`): The cache instance used across all RPC instances.
- `defaultResponseHeaders` (`Headers`): Default headers added to every response unless overridden by the specific RPC method or an `HttpError`.
- `errorTransformer` (`(rpc: Rpc.Request, err: Error) => HttpError`): Function used to transform errors caught during RPC execution into `HttpError` objects.

###### Static Methods

###### `setCache(cache: Rpc.CacheInterface)`

Sets the cache instance to be used across all RPC instances.

###### `setDefaultResponseHeaders(headers: Headers)`

Sets the default headers to be added to every response.

###### `setErrorTransformer(transformError: (rpc: Rpc.Request, err: Error) => HttpError)`

Sets the global function to transform errors caught during RPC execution into `HttpError` objects. This allows customizing error responses (e.g., handling validation errors differently).

###### `restoreErrorTransformer()`

Restores the default error transformer.

##### Protected Properties

- `context` (`RpcContext`): **Getter**. Provides access to the `RpcContext` for the current request lifecycle. This context holds request details (headers, body, cf properties) and allows setting default response metadata. Accessible within RPC methods via `this.context`.

##### Public Methods

###### `fetch(rpc: Rpc.Request, req: Request): Promise<Response>`

The main entry point for handling an RPC request. It parses the `rpc` payload, determines if it's a single or batch request, calls the appropriate internal handler (`call` or `callMany`), and returns the final `Response`.

**Parameters:**

- `rpc` (`Rpc.Request`): The parsed RPC request payload, typically derived from the HTTP request body (e.g., using `rpcProxy.payloadToRequest`). Contains `resource`, `args`, `batch`, `responseType`.
- `req` (`Request`): The original incoming HTTP `Request` object.

**Returns:**

- (`Promise<Response>`): A promise resolving to the final `Response` object to be sent back to the client.

###### `createResponse<T>(input: T, init?: Rpc.ResponseInit): RpcResponse<T>`

A helper method for creating `RpcResponse` objects within RPC methods. Ensures consistent response formatting and handling of default headers/status.

**Parameters:**

- `input` (`T`): The body of the response.
- `init` (`Rpc.ResponseInit`, optional): Options like `status`, `headers`, and `cache` directives.

**Returns:**

- (`RpcResponse<T>`): A new `RpcResponse` instance.

##### Protected Lifecycle Hooks

These methods can be implemented in subclasses to intercept requests and responses.

###### `async $onBeforeRequest(rpc: Rpc.Request, req: Request): Promise<void | Rpc.Request>`

Called _before_ an RPC resource method is executed. It receives the parsed RPC request and the original HTTP request.

- Can be used for tasks like authentication, authorization, logging, or modifying the RPC arguments before execution.
- If it throws an error, the RPC call is aborted, and an error response is generated.
- If it returns a modified `Rpc.Request` object, that modified object will be used for the subsequent method call.
- If the RPC resource is nested (e.g., `parent.child.method`), the hook on the `parent` runs first, followed by the `child`.

###### `async $onAfterResponse(res: RpcResponse, rpc: Rpc.Request, req: Request): Promise<void | RpcResponse>`

Called _after_ an RPC resource method has successfully executed and generated an `RpcResponse`, but _before_ the final response is sent to the client.

- Can be used for logging, modifying the response headers or body, or cleanup tasks.
- It receives the generated `RpcResponse`, the original RPC request, and the HTTP request.
- If it throws an error, an error response is generated instead of the original `res`.
- If it returns a modified `RpcResponse` object, that modified response is sent to the client.
- If the RPC resource is nested, the hook on the `child` runs first, followed by the `parent`.

##### Defining RPC Resources

- Public methods defined in your `Rpc` subclass become callable RPC resources.
- Method names starting with `#`, `_`, or `$` are considered private and **cannot** be called remotely.
- Nested `Rpc` instances assigned to public properties create nested resources (e.g., `this.users = new UserRpc();` allows calls like `users.getById`).
- Methods can return:
  - Plain JavaScript values (objects, arrays, strings, numbers, booleans, null): Automatically wrapped in a `RpcResponse` with `Content-Type: application/json` (or `text/plain` for strings).
  - `RpcResponse` instances: Allows full control over status, headers, and caching directives.
  - Standard `Response` instances: Handled similarly to `RpcResponse`.
  - `Promise`: The resolved value of the promise is handled as above.
- Methods can throw errors. These are automatically caught and transformed into `HttpError` responses using the configured `errorTransformer`.

##### Caching

- If a `cache` instance is provided to the constructor, the `Rpc` class will attempt to cache responses.
- Caching is only applied to single (non-batch) requests where the resource method returns an `RpcResponse` with `cache: true` or `cache: { ttlSeconds: ... }`.
- The cache key is generated based on the resource path and JSON-stringified arguments (`rpc_${resource}_${JSON.stringify(args)}`).
- The `cache.wrap` method is used to fetch from/store to the cache.

##### Server-Side Handling Example

This demonstrates how a server (e.g., Cloudflare Worker, Node.js server) might parse an incoming HTTP request and dispatch it to the `Rpc.fetch` method.

```typescript
// --- Server-side handling (e.g., in a Cloudflare Worker fetch handler) ---
import _ from 'lodash'; // Assuming lodash for isPlainObject
import Rpc from 'use-request-utils/rpc';
import Request from 'use-request-utils/request'; // Your custom Request class if needed
import HttpError from 'use-http-error';

// Assume 'this.rpc' is an instantiated Rpc service (e.g., new RootRpc())
// Assume 'req' is the incoming Request object from the environment

async function handleRpcRequest(req: Request /* or standard Request */) {
	if (req.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	try {
		// RPC requests are expected to be FormData
		const form = await req.formData();
		const formBody = form.get('body'); // Optional additional body part (e.g., file)
		const formRpc = form.get('rpc'); // The RPC payload as a string

		if (typeof formRpc !== 'string') {
			throw new HttpError(400, 'Missing RPC payload');
		}

		// Safely parse the RPC payload string
		const rpc = Rpc.parseString(formRpc);

		// Validate the parsed payload structure
		if (!_.isPlainObject(rpc) || typeof rpc.resource !== 'string' || !Array.isArray(rpc.args)) {
			throw new HttpError(400, 'Invalid RPC payload structure');
		}

		// Dispatch the request to the Rpc instance's fetch method
		// Pass the original request details (headers, cf, method) and potentially
		// the extracted body part if your RPC methods expect it via context.body
		return await this.rpc!.fetch(
			rpc,
			new Request(req.url, {
				// Use standard Request or your CustomRequest
				body: formBody instanceof Blob ? formBody : null, // Handle potential File/Blob body
				cf: req.cf, // Pass Cloudflare properties if available
				headers: req.headers,
				method: req.method // Keep original method (should be POST)
			})
		);
	} catch (error) {
		const httpError = HttpError.wrap(error);
		return Response.json(httpError.toJson(), {
			status: httpError.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
```

##### Usage Example

```typescript
import Rpc from 'use-request-utils/rpc';
import RpcResponse from 'use-request-utils/rpc-response';
import RpcContext from 'use-request-utils/rpc-context';
import HttpError from 'use-http-error';
import type Request from 'use-request-utils/request'; // Assuming custom Request

// Define an interface for the User service (optional but good practice)
interface IUserRpc {
	getById(id: number): Promise<{ id: number; name: string }>;
	create(data: { name: string; email: string }): Promise<{ id: number }>;
}

class UserRpc extends Rpc implements IUserRpc {
	// Example resource method
	async getById(id: number): Promise<{ id: number; name: string }> {
		console.log('Context User Agent:', this.context.headers.get('User-Agent'));
		if (id <= 0) {
			throw new HttpError(400, 'Invalid user ID');
		}
		// Simulate fetching user
		const user = { id, name: `User ${id}` };

		// Return data with caching enabled for 1 minute
		return this.createResponse(user, { cache: { ttlSeconds: 60 } });
	}

	async create(data: { name: string; email: string }): Promise<{ id: number }> {
		// Simulate creating user
		const newId = Math.floor(Math.random() * 1000);
		this.context.setDefaultResponseStatus(201); // Set default status for this call
		return { id: newId }; // Plain object uses default status/headers
	}

	// Private method - not callable via RPC
	_internalHelper() {
		// ...
	}
}

class RootRpc extends Rpc {
	// Nested RPC resource
	public users = new UserRpc({ cache: this.cache }); // Pass cache down

	// Simple resource on the root
	async ping(): Promise<string> {
		return 'pong';
	}

	// Example hook on the root RPC
	async $onBeforeRequest(rpc: Rpc.Request, req: Request) {
		console.log(`RPC Call [${rpc.resource}]:`, rpc.args);
		// Example: Check auth token from context (set by a previous hook/middleware)
		// if (!this.context.get('isAuthenticated')) {
		//   throw new HttpError(401, 'Unauthorized');
		// }
	}

	async $onAfterResponse(res: RpcResponse, rpc: Rpc.Request, req: Request) {
		console.log(`RPC Response [${rpc.resource}]: Status ${res.status}`);
		// Add a common header to all responses from this point down
		res.headers.set('X-Rpc-Processed', 'true');
		return res; // Return the modified response
	}
}
```

### RPC Proxy (`/rpc-proxy.ts`)

Provides utilities for creating client-side proxies to interact with RPC services built using the `Rpc` base class. It handles request creation, response parsing, batching, and different response type expectations (`asObject`, `asResponse`).

#### `create`

```typescript
create<T, SetAbortable = false>(handler: RpcProxy.Handler, ...): RpcProxy.Proxy<T, SetAbortable>
```

Creates a typed client proxy for an RPC service. Method calls on the proxy are translated into RPC requests executed by the provided `handler`.

**Parameters:**

- `handler` (`RpcProxy.Handler`): A function that takes the generated `Rpc.Request` payload and `RpcProxyRequestOptions`, performs the actual network request (e.g., using `fetch`), and returns the result.
- `path` (`string[]`, internal): Used recursively to track nested resources.
- `parentContext` (`{ batch: boolean; options: RpcProxyRequestOptions }`, internal): Used recursively for batching.
- `responseType` (`Rpc.ResponseType`, internal): Tracks calls to `.asObject()` or `.asResponse()`.

**Returns:**

- (`RpcProxy.Proxy<T, SetAbortable>`): A proxy object matching the structure of the target RPC service `T`. Methods on the proxy accept the original arguments plus an optional final `RpcProxyRequestOptions` argument. `SetAbortable` indicates if the handler returns an abortable promise.

**Proxy Behavior:**

- Calling a method (e.g., `proxy.users.getById(123)`) triggers the `handler` with the corresponding `Rpc.Request`.
- `.asObject()`: Modifies the _next_ call to expect an `Rpc.ResponseObject` from the handler.
- `.asResponse()`: Modifies the _next_ call to expect a raw `Response` from the handler.
- `batch([...])`: Collects multiple RPC calls and sends them as a single batch request to the handler.
- `options({...})`: Creates an `RpcProxyRequestOptions` object, typically passed as the _last_ argument to a method call or `batch`.

#### `createTestCaller`

```typescript
createTestCaller<T extends Rpc>(instance: T, testOptions?: RpcProxy.Test.Options): RpcProxy.Test.Caller<T>
```

Creates a proxy specifically for testing an `Rpc` instance _without_ network requests. It directly calls the `instance.fetch` method. Returns an abortable proxy.

**Parameters:**

- `instance` (`T extends Rpc`): The actual instance of the RPC service to test.
- `testOptions` (`RpcProxy.Test.Options`, optional):
  - `cf` (`CfProperties`, optional): Mock Cloudflare properties to pass to the RPC context.
  - `headers` (`Headers`, optional): Mock request headers.
  - `mock` (`Function`, optional): A callback function that receives details about the generated request before it's processed by the RPC instance. Useful for asserting request parameters in tests.

**Returns:**

- (`RpcProxy.Test.Caller<T>`): A proxy object for testing, matching the RPC service structure, with abortable promises.

#### `createRequest`

```typescript
createRequest(rpc: Rpc.Request, options?: Partial<{...}>): Request
```

Constructs a standard `Request` object suitable for sending an RPC call. It packages the `Rpc.Request` payload into `FormData`.

**Parameters:**

- `rpc` (`Rpc.Request`): The RPC payload (resource, args, etc.).
- `options` (`Partial<{...}>`, optional): Options similar to `requestBuilder`, including:
  - `body`: Optional `Blob` (e.g., for file uploads alongside RPC). _Not allowed for batch requests_.
  - `cf`: Cloudflare properties.
  - `headers`: Additional request headers.
  - `origin`: Base URL (default: `http://localhost`).
  - `pathname`: Path for the RPC endpoint (default: `/rpc`).
  - `signal`: AbortSignal.

**Returns:**

- (`Request`): A `Request` object ready to be sent via `fetch`. Body is `FormData` containing an `rpc` field (JSON string) and optionally a `body` field. `Content-Type` header is automatically managed for `FormData`.

**Throws:**

- `HttpError(400)`: If `options.body` is provided for a batch request.

#### `createResponse`

```typescript
createResponse<T>(input: Response): Promise<T | Rpc.ResponseObject<T> | Response>
```

Parses the `Response` received from an RPC call, handling different response types (`''`, `'object'`, `'response'`) and batching based on response headers (`rpc-response-type`, `rpc-response-batch`).

**Parameters:**

- `input` (`Response`): The raw `Response` object received from the RPC server.

**Returns:**

- (`Promise<T | Rpc.ResponseObject<T> | Response>`): A promise resolving to:
  - The parsed body (`T`) if `rpc-response-type` is empty or missing.
  - An `Rpc.ResponseObject<T>` if `rpc-response-type` is `'object'`.
  - The raw `Response` (`input`) if `rpc-response-type` is `'response'`.
  - If `rpc-response-batch` is `true`, the body/object/response will contain an array corresponding to the batched results. Errors in batched responses are represented as `null` in the array for the default case, or as the error body within the `Rpc.ResponseObject` or `Response` for the other cases.

#### `payloadToRequest`

```typescript
payloadToRequest(payload: RpcProxy.Payload): Rpc.Request
```

Sanitizes and validates an RPC payload object, ensuring it conforms to the `Rpc.Request` structure, especially for batch requests. Invalid entries in a batch `args` array are replaced with a default empty request structure.

**Parameters:**

- `payload` (`RpcProxy.Payload`): The raw payload object generated by the proxy.

**Returns:**

- (`Rpc.Request`): A validated `Rpc.Request` object.

#### `throwError`

```typescript
throwError(input: Response): Promise<null>
```

Checks if a `Response` has a non-OK status (`!input.ok`). If it does, and the response type is _not_ `'object'` or `'response'`, it throws an appropriate `HttpError`. Otherwise, it resolves to `null`. Used internally by handlers like `proxyClientToWorker`.

**Parameters:**

- `input` (`Response`): The response to check.

**Returns:**

- (`Promise<null>`): Resolves to `null` if the response is OK or if the response type indicates errors should not be thrown.

**Throws:**

- `HttpError`: If `!input.ok` and the response type doesn't prevent throwing.

#### `RpcProxyRequestOptions` Class

A class to structure options passed to RPC proxy method calls.

```typescript
class RpcProxyRequestOptions {
	public body: Blob | null; // Optional body (e.g., file upload)
	public ephemeralCacheTtlSeconds: number; // Cache TTL (default: 1)
	public headers: Headers; // Additional request headers
	public signal: AbortSignal | null; // Abort signal

	constructor(options?: Partial<Omit<RpcProxyRequestOptions, 'toJson'>>);

	toJson(): object; // Returns a serializable representation
}
```

#### Usage Examples

##### Client Setup

```typescript
import rpcProxy, { RpcProxyRequestOptions } from 'use-request-utils/rpc-proxy';
import headersUtil from 'use-request-utils/headers';
import HttpError from 'use-http-error';
import type { RootRpc } from './my-rpc-service'; // Assuming RootRpc is your Rpc class type

// Define the handler that sends the request
async function rpcHandler(rpc: Rpc.Request, options: RpcProxyRequestOptions) {
	const request = rpcProxy.createRequest(rpc, {
		// Pass options from the proxy call
		body: options.body,
		headers: options.headers,
		signal: options.signal,
		// Configure endpoint
		pathname: '/api/rpc'
	});

	const response = await fetch(request);

	// Error handling (optional here, createResponse also handles it based on type)
	// if (!response.ok) {
	//   await rpcProxy.throwError(response); // Throws HttpError if needed
	// }

	return rpcProxy.createResponse(response); // Parse based on response headers
}

// Create the typed proxy client
const client = rpcProxy.create<RootRpc>(rpcHandler);

// --- Calling RPC Methods ---

// Simple call
const pong = await client.ping(); // Assumes ping returns 'pong'
console.log(pong);

// Call with arguments
const user = await client.users.getById(123);
console.log(user); // Output: { id: 123, name: 'User 123' }

// Call with RpcProxyRequestOptions
const userWithOptions = await client.users.getById(
	456,
	client.options({
		headers: new Headers({ 'X-Client-ID': 'frontend-app' }),
		ephemeralCacheTtlSeconds: 30 // Override default cache TTL for this call if applicable
	})
);
console.log(userWithOptions);

// Call expecting raw Response
const userResponse = await client.users.getById.asResponse(789);
if (userResponse.ok) {
	const userData = await userResponse.json();
	console.log('User from Response:', userData);
	console.log('Response status:', userResponse.status);
}

// Call expecting structured object { body, headers, status }
const userObject = await client.users.getById.asObject(101);
console.log('User Object:', userObject);
// Output: { body: { id: 101, name: 'User 101' }, headers: {...}, status: 200, ok: true }

// --- Batching Requests ---
const results = await client.batch([
	client.ping(), // Default response type
	client.users.getById(1), // Default response type
	client.users.getById.asObject(2), // Expect Rpc.ResponseObject
	client.users.getById.asResponse(3) // Expect Response
]);

console.log('Batch Ping:', results[0]); // Output: 'pong'
console.log('Batch User 1:', results[1]); // Output: { id: 1, name: 'User 1' }
console.log('Batch User 2 Object:', results[2]); // Output: { body: { id: 2, ...}, ... }
console.log('Batch User 3 Response:', results[3]); // Output: Response object

// Batching with options (applied to the batch request itself)
const batchWithOptions = await client.batch([client.ping()], client.options({ headers: new Headers({ 'X-Batch-ID': 'batch-123' }) }));

// Batch expecting raw Response for the whole batch
const batchResponse = await client.batch.asResponse([client.ping()]);
const batchData = await batchResponse.json();
console.log('Batch Data from Response:', batchData); // Output: [ 'pong' ]
```

##### Testing RPC Services

```typescript
import { RpcProxy } from 'use-request-utils/rpc-proxy';
import rpcProxy from 'use-request-utils/rpc-proxy';
import { MyRpcService } from './my-rpc-service'; // Your Rpc class
import { vi } from 'vitest';

describe('MyRpcService', () => {
  let rpcInstance: MyRpcService;
  let testClient: RpcProxy.Test.Caller<MyRpcService>;
  let mockHandler: Mock;

  beforeEach(() => {
    rpcInstance = new MyRpcService(); // Your actual RPC instance
    mockHandler = vi.fn();
    testClient = rpcProxy.createTestCaller(rpcInstance, {
      cf: { country: 'TEST' }, // Mock CF properties
      headers: new Headers({ 'X-Test-Header': 'tester' }),
      mock: mockHandler // Spy on internal calls
    });
  });

  it('should call the correct method', async () => {
    const result = await testClient.someResource.action({ value: 1 });

    expect(result).toEqual({ /* expected result */ });

    // Assert mock was called with expected parameters
    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
      cf: { country: 'TEST' },
      headers: expect.objectContaining({ 'x-test-header': 'tester' }),
      rpc: {
        resource: 'someResource.action',
        args: [{ value: 1 }],
        batch: false,
        responseType: 'default'
      },
      url: 'http://localhost/api/rpc' // Default URL for testing
    }));
  });

  it('should handle batch calls in tests', async () => {
     const results = await testClient.batch([
         testClient.someResource.action({ value: 1 }),
         testClient.otherResource.find.asObject('test')
     ]);

     expect(results[0]).toEqual({ /* ... */ });
     expect(results[1]).toEqual({ body: { /* ... */ }, headers: { ... }, status: 200, ok: true });

     expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        rpc: expect.objectContaining({ batch: true })
     }));
  });
});
```

---

### `useFetchHttp` React Hook (`/use-fetch-http.ts`)

A factory hook for declaratively fetching data using the enhanced `fetch.http` utility. This hook manages loading states, data persistence, error handling, dependency tracking, and supports automatic interval polling.

**Usage**

`useFetchHttp` returns an object containing methods for fetching data:

- `fetchHttp`: Initiates fetches automatically based on dependencies, intervals, etc.
- `lazyFetchHttp`: Prepares a fetch that must be triggered manually.

```typescript
import useFetchHttp from 'use-request-utils/use-fetch-http';

function MyComponent() {
	// 1. Get the http fetcher instance
	const { fetchHttp, lazyFetchHttp } = useFetchHttp();

	// --- Automatic/Eager Fetching with fetchHttp ---
	const { data: user, loading: userLoading } = fetchHttp(/* ... fn, options ... */);

	// --- Manual/Lazy Fetching with  throw if options.triggerInterval is not a num ---
	const { fetch: triggerSearch, data: searchResults, loading: searchLoading } = lazyFetchHttp(/* ... fn, options ... */);

	// Call triggerSearch() when needed
}
```

**API**

The `useFetchHttp()` hook returns an object with the following methods:

1.  **`fetchHttp<T, Mapped = T>(fn, options?)`**

    - Initiates a data fetch automatically based on the provided `options`. Replaces the functionality of the old top-level `useFetchHttp` hook.
    - **`fn` (`(fetch: Fetch.Http, ...args: any[]) => Promise<T> | null`)**: The asynchronous function to execute for fetching data. Receives the `fetch.http` instance and any arguments passed to the _manual_ `fetch()` call (returned in the response object). Return `null` to skip fetching conditionally.
    - **`options` (`UseFetchOptions<T, Mapped>`, optional)**: Configuration options (See details below in Examples/Previous description):
      - `effect`: Function to execute when the data is fetched. Receives the `fetch.http` instance and the fetched data.
      - `ignoreAbort`: Whether to ignore the abort signal.
      - `mapper`: Function to map the fetched data. Receives the `fetch.http` instance and the fetched data.
      - `shouldFetch`: Function to determine if the data should be fetched. Receives the `fetch.http` instance and the fetched data.
      - `triggerDeps`: Array of dependencies to trigger the fetch.
      - `triggerDepsDebounce`: Number of milliseconds to debounce the fetch.
      - `triggerInterval`: Number of milliseconds to trigger the fetch.
    - **Returns**: `UseFetchResponse<Mapped>`. An object containing fetching state and control methods:
      - **State Fields:**
        - `data` (`Mapped | null`): The fetched and mapped data.
        - `error` (`HttpError | null`): Any error that occurred during fetching.
        - `fetchTimes` (`number`): The number of times a fetch has been initiated.
        - `lastFetchDuration` (`number`): The duration in milliseconds of the last fetch operation.
        - `loaded` (`boolean`): Whether data has been successfully loaded at least once.
        - `loadedTimes` (`number`): The number of times data has been successfully loaded.
        - `loading` (`boolean`): Whether a fetch is currently in progress.
        - `resetted` (`boolean`): Whether the state has been reset.
        - `runningInterval` (`number`): The current interval in milliseconds (0 if no interval is running).
        - `settled` (`boolean`): Whether `setData()` has been called at least once.
        - `settledTimes` (`number`): The number of times `setData()` has been called.
      - **Control Methods:**
        - `abort()`: Aborts the current fetch operation.
        - `fetch(...args)`: Manually triggers a fetch with optional arguments.
        - `reset()`: Resets all state to initial values.
        - `setData(update)`: Updates the data directly (sets `settled` to `true` and increments `settledTimes`).
        - `startInterval(interval?)`: Starts interval polling.
        - `stopInterval()`: Stops interval polling.

2.  **`lazyFetchHttp<T, Mapped = T>(fn, options?)`**
    - Prepares a data fetch but **does not** run it automatically. Use the `fetch` function returned in the `UseFetchResponse` object to trigger the request manually.
    - **`fn` (`(fetch: Fetch.Http, ...args: any[]) => Promise<T> | null`)**: Same fetch function definition as for `fetchHttpfetch`.
    - **`options` (`Pick<UseFetchOptions<T, Mapped>, 'effect' | 'ignoreAbort' | 'mapper'>`, optional)**:
      - `effect`: Function to execute when the data is fetched. Receives the `fetch.http` instance and the fetched data.
      - `ignoreAbort`: Whether to ignore the abort signal.
      - `mapper`: Function to map the fetched data. Receives the `fetch.http` instance and the fetched data.
    - **Returns**: `UseFetchResponse<Mapped>`. Call the included `fetch(...)` function to execute the request.

#### Usage Examples

```jsx
import React, { useState, useCallback } from 'react';
import useFetchHttp from 'use-request-utils/use-fetch-http';

interface User {
  id: number;
  name: string;
  email: string;
}

// Example Component using fetchHttp (Automatic/Eager)
function UserProfile({ userId }) {
  const { fetchHttp } = useFetchHttp(); // Get the hook instance

  const fetchUser = useCallback((fetch: Fetch.Http, id: number) => {
    if (!id) return null;
    console.log(`Fetching user ${id}...`);
    return fetch.http<User>(`https://api.example.com/users/${id}`);
  }, []);

  // Use http.fetch for automatic fetching based on triggerDeps
  const { data: user, loading, error, loaded, reset, loadedTimes, fetch: manualFetch } = fetchHttp(
    fetchUser,
    {
	  shouldFetch: !!userId && userId > 0,
      triggerDeps: [userId],
      triggerDepsDebounce: 200
    }
  );

  if (!userId) {
    return <div>Please select a user.</div>;
  }
  // ... rest of rendering logic (same as original example) ...

  return (
    <div>
      <h1>{user?.name} {loading ? '(Updating...)' : ''}</h1>
      <p>Email: {user?.email}</p>
      <p>Loaded {loadedTimes} times.</p>
      <button onClick={reset}>Reset</button>
      <button onClick={() => manualFetch(userId)} disabled={loading}>
        Refresh Manually
      </button>
    </div>
  );
}

// Example Component using lazyFetchHttp (Manual)
function SearchUsers() {
  const { lazyFetchHttp } = useFetchHttp(); // Get the hook instance
  const [query, setQuery] = useState('');

  const searchUsersFn = useCallback((fetch: Fetch.Http, searchTerm: string) => {
    if (!searchTerm) return null;
    console.log(`Searching users: ${searchTerm}`);
    return fetch.http.asObject<{ results: User[] }>(
      `https://api.example.com/search/users?q=${encodeURIComponent(searchTerm)}`
    );
  }, []);

  // Use lazyFetchHttp for manual triggering
  const { data: searchResult, loading, error, fetch: triggerSearch } = lazyFetchHttp(
    searchUsersFn,
    {
      mapper: ({ data }) => (data?.status === 200 ? data.body.results : [])
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query); // Call the fetch function returned by fetchLazy
  };

  // ... rest of rendering logic (same as original example) ...
  return (
     <div>
      <form onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <div>Search failed: {error.message}</div>}
      {searchResult && (
        <ul>
          {searchResult.map(user => (
            <li key={user.id}>{user.name} ({user.email})</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Example Component with Interval Polling using fetchHttp
function LiveStatus() {
    const { fetchHttp } = useFetchHttp(); // Get the hook instance

    const fetchStatus = useCallback((fetch: Fetch.Http) => {
        console.log('Fetching live status...');
        return fetch.http.asResponse('https://api.example.com/live-status');
    }, []);

    // Use fetchHttp with triggerInterval option
    const { data: response, loading, error, runningInterval, stopInterval, startInterval } = fetchHttp(
        fetchStatus,
        {
            triggerInterval: 5000 // Poll every 5 seconds
        }
    );

    // ... rest of rendering logic and useEffect for processing response (same as original example) ...
    const [statusText, setStatusText] = useState('');
    React.useEffect(() => {
        if (response?.ok) {
            response.clone().text().then(setStatusText);
        } else if (response) {
            setStatusText(`Error: ${response.status}`);
        }
    }, [response]);


    return (
        <div>
            <h2>Live Status: {loading ? 'Updating...' : statusText}</h2>
            {error && <p>Error polling status: {error.message}</p>}
            <p>Polling interval: {runningInterval}ms</p>
            <button onClick={stopInterval} disabled={runningInterval === 0}>Stop Polling</button>
            <button onClick={() => startInterval()} disabled={runningInterval > 0}>Start Polling</button>
        </div>
    );
}
```

### `useFetchRpc` React Hook (`/use-fetch-rpc.ts`)

React hook for declaratively calling methods on an RPC service defined using the `Rpc` base class. It leverages the `rpcProxy` client and manages state (loading, data, error), dependencies, debouncing, and interval polling.

**Usage**

`useFetchRpc` returns an object containing methods for executing RPC calls:

- `fetchRpc`: Executes RPC calls automatically based on dependencies, intervals, etc.
- `lazyFetchRpc`: Prepares an RPC call that must be triggered manually.

```typescript
import useFetchRpc from 'use-request-utils/use-fetch-rpc';
import type { MyRpcService } from './my-rpc-service'; // Import your Rpc service type

function MyRpcComponent() {
	// 1. Get the rpc fetcher instance, specifying the Rpc service type
	const { fetchRpc, lazyFetchRpc } = useFetchRpc<MyRpcService>();

	// --- Automatic/Eager Fetching with fetchRpc ---
	const { data: userData, loading: userLoading } = fetchRpc(/* ... fn, options ... */);

	// --- Manual/Lazy Fetching with lazyFetchRpc ---
	const { fetch: triggerAction, data: actionResult, loading: actionLoading } = lazyFetchRpc(/* ... fn, options ... */);

	// Call triggerAction() when needed
}
```

**API**

The `useFetchRpc<R extends Rpc>(requestOptions?)` hook returns an object with the following methods:

- **`requestOptions` (`{ headers?: Headers; pathname?: string }`, optional)**: Options passed to the underlying HTTP request for the RPC call (e.g., custom headers, endpoint path).

1.  **`fetchRpc<T, Mapped = T>(fn, options?)`**

    - Initiates a data fetch automatically based on the provided `options`. Replaces the functionality of the old top-level `useFetchRpc` hook.
    - **`fn` (`(rpc: RpcInstance, ...args: any[]) => Promise<T> | null`)**: The asynchronous function to execute for fetching data. Receives the `rpcProxy` instance and any arguments passed to the _manual_ `fetch()` call (returned in the response object).
    - **`options` (`UseFetchOptions<T, Mapped>`, optional)**: Configuration options (See details below in Examples/Previous description):
      - `effect`: Function to execute when the data is fetched. Receives the `rpcProxy` instance and the fetched data.
      - `ignoreAbort`: Whether to ignore the abort signal.
      - `mapper`: Function to map the fetched data. Receives the `rpcProxy` instance and the fetched data.
      - `shouldFetch`: Function to determine if the data should be fetched. Receives the `rpcProxy` instance and the fetched data.
      - `triggerDeps`: Array of dependencies to trigger the fetch.
      - `triggerDepsDebounce`: Number of milliseconds to debounce the fetch.
      - `triggerInterval`: Number of milliseconds to trigger the fetch.
    - **Returns**: `UseFetchResponse<Mapped>`. An object containing fetching state and control methods:
      - **State Fields:**
        - `data` (`Mapped | null`): The fetched and mapped data.
        - `error` (`HttpError | null`): Any error that occurred during fetching.
        - `fetchTimes` (`number`): The number of times a fetch has been initiated.
        - `lastFetchDuration` (`number`): The duration in milliseconds of the last fetch operation.
        - `loaded` (`boolean`): Whether data has been successfully loaded at least once.
        - `loadedTimes` (`number`): The number of times data has been successfully loaded.
        - `loading` (`boolean`): Whether a fetch is currently in progress.
        - `resetted` (`boolean`): Whether the state has been reset.
        - `runningInterval` (`number`): The current interval in milliseconds (0 if no interval is running).
        - `settled` (`boolean`): Whether `setData()` has been called at least once.
        - `settledTimes` (`number`): The number of times `setData()` has been called.
      - **Control Methods:**
        - `abort()`: Aborts the current fetch operation.
        - `fetch(...args)`: Manually triggers a fetch with optional arguments.
        - `reset()`: Resets all state to initial values.
        - `setData(update)`: Updates the data directly (sets `settled` to `true` and increments `settledTimes`).
        - `startInterval(interval?)`: Starts interval polling.
        - `stopInterval()`: Stops interval polling.

2.  **`lazyFetchRpc<T, Mapped = T>(fn, options?)`**.
    - Prepares a data fetch but **does not** run it automatically. Use the `fetch` function returned in the `UseFetchResponse` object to trigger the request manually.
    - **`fn` (`(rpc: RpcInstance, ...args: any[]) => Promise<T> | null`)**: Same fetch function definition as for `fetchRpc`.
    - **`options` (`Pick<UseFetchOptions<T, Mapped>, 'effect' | 'ignoreAbort' | 'mapper'>`, optional)**:
      - `effect`: Function to execute when the data is fetched. Receives the `rpcProxy` instance and the fetched data.
      - `ignoreAbort`: Whether to ignore the abort signal.
      - `mapper`: Function to map the fetched data. Receives the `rpcProxy` instance and the fetched data.
    - **Returns**: `UseFetchResponse<Mapped>`. Call the included `fetch(...)` function to execute the request.

#### Usage Examples

```jsx
import React, { useState, useCallback } from 'react';
import useFetchRpc from 'use-request-utils/use-fetch-rpc';
import type { RootRpc } from './my-rpc-service'; // Import the *type* of your Rpc class

// --- Example Component using fetchRpc (Automatic/Eager) ---
function UserDetails({ userId }) {
  const { fetchRpc } = useFetchRpc<RootRpc>(); // Get the hook instance

  const fetchUserData = useCallback((rpc: RootRpc, id: number) => {
    if (!id || id <= 0) return null;
    console.log(`RPC: Fetching user ${id}`);
    return rpc.users.getById(id); // Execute RPC call inside the function
  }, []);

  // Use fetchRpc for automatic execution based on triggerDeps
  const { data: user, loading, error, loadedTimes, reset, fetch: manualFetch } = fetchRpc(
    fetchUserData,
    {
      triggerDeps: [userId],
    },
    {
      headers: new Headers({ 'X-App-Version': '1.2.0' }),
    }
  );

  // ... rest of rendering logic (same as original example) ...
   if (!userId) return <div>Select a user ID.</div>;
    if (loading && loadedTimes === 0) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
      <div>
        <h2>User: {user?.name} {loading ? '(Refreshing...)' : ''}</h2>
        <p>ID: {user?.id}</p>
        <button onClick={reset}>Reset</button>
        <button onClick={() => manualFetch(userId)} disabled={loading}>Manual Fetch</button>
      </div>
    );
}

// --- Example Component using lazyFetchRpc (Manual) ---
function CreateUserForm() {
  const { lazyFetchRpc } = useFetchRpc<RootRpc>(); // Get the hook instance
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const createUserFn = useCallback((rpc: RootRpc, userData: { name: string; email: string }) => {
    console.log('RPC: Creating user', userData);
    return rpc.users.create(userData); // Execute RPC call inside the function
  }, []);

  // Use lazyFetchRpc for manual triggering
  const { data: createdUser, loading, error, fetch: submitCreateUser, reset } = lazyFetchRpc(
    createUserFn
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCreateUser({ name, email }); // Call the fetch function returned by fetchLazy
  };

  // ... rest of rendering logic (same as original example) ...
  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {createdUser && <p>User created with ID: {createdUser.id}</p>}
    </form>
  );
}

// --- Example Component using batching with fetchRpc ---
function DashboardData() {
    const { fetchRpc } = useFetchRpc<RootRpc>(); // Get the hook instance

    const fetchDashboardData = useCallback((rpc: RootRpc) => {
        console.log('RPC: Fetching dashboard batch');
        // Execute batch call inside the function
        return rpc.batch([
            rpc.stats.getVisitors(),
            rpc.orders.getRecent.asObject(5),
            rpc.users.getById.asResponse(1)
        ]);
    }, []);

    // Use fetchRpc for automatic execution + interval
    const { data, loading, error } = fetchRpc(fetchDashboardData, {
        triggerInterval: 30000 // Refresh every 30s
    });

    // ... rest of rendering logic (same as original example) ...
    if (loading && !data) return <div>Loading Dashboard...</div>;
    if (error) return <div>Error loading dashboard: {error.message}</div>;

    const [visitors, ordersResult, userResponse] = data || [null, null, null];

    return (
        <div>
            <h2>Dashboard {loading ? '(Updating...)' : ''}</h2>
            <p>Visitors: {JSON.stringify(visitors)}</p>
            <p>Recent Orders (Status {ordersResult?.status}): {JSON.stringify(ordersResult?.body)}</p>
            <p>User 1 Response Status: {userResponse?.status}</p>
        </div>
    );
}
```

---

## Author

**Felipe Rohde**

- Email: feliperohdee@gmail.com
- GitHub: [@feliperohdee](https://github.com/feliperohdee)

## License

[MIT](LICENSE)
