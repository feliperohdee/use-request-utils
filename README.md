# use-request-utils

A lightweight, [browser, cloudflare workers, node, deno, etc.] compatible collection of utilities for handling web request authentication, cookies, JWT tokens, and cryptographic operations.

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Components](#components)
  - [Authentication](#authentication)
  - [Cookies](#cookies)
  - [JWT Tokens](#jwt-tokens)
  - [Cryptography](#cryptography)
  - [Headers](#headers)
  - [Request Builder](#request-builder)
  - [Router](#router)
- [Usage Examples](#usage-examples)
  - [Basic Authentication](#basic-authentication)
  - [Bearer Authentication](#bearer-authentication)
  - [JWT Authentication](#jwt-authentication)
  - [Cookie Management](#cookie-management)
  - [Headers Management](#headers-management)
  - [Request Builder](#request-builder-usage)
  - [Router](#router-usage)
- [API Reference](#api-reference)
- [Testing](#testing)
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

- 🔐 Multiple authentication methods (Basic, Bearer, JWT)
- 🍪 Comprehensive cookie handling with support for signed cookies
- 🔑 JWT token generation, verification, and management
- 🔒 Cryptographic utilities including SHA-1 and SHA-256 hashing
- 📋 Headers manipulation, merging, and conversion utilities
- 🛠️ Request builder for simplified HTTP request creation
- 🧭 Fast and flexible routing with path parameter support
- 🧩 Modular architecture for easy integration
- ⚡ Browser-compatible implementation using Web Crypto API
- 📦 TypeScript support with comprehensive type definitions

## Components

### Authentication

- **AuthBasic**: HTTP Basic Authentication implementation
- **AuthBearer**: Bearer token authentication
- **AuthJwt**: JWT-based authentication with encryption support

### Cookies

- **cookies**: High-level cookie management
- **cookie-parser**: Cookie parsing utilities
- **cookie-serializer**: Cookie serialization with support for prefixes and attributes

### JWT Tokens

- **jwt**: JWT token generation, verification, and decoding
- **jwt-util**: Utilities for JWT token manipulation

### Cryptography

- **crypto**: Cryptographic functions like SHA-1 and SHA-256 hashing
- **buffer**: Buffer manipulation and timing-safe comparison

### Headers

- **headers**: Utilities for managing HTTP headers, including creation from JSON, merging multiple headers, and converting to JSON format

### Request Builder

- **request-builder**: Utility for building HTTP requests with support for various data formats, headers, cookies, and query parameters

### Router

- **Router**: Fast and flexible routing implementation with support for path parameters, patterns, and wildcards

## Usage Examples

### Basic Authentication

```typescript
import AuthBasic from 'use-request-utils/auth-basic';

// Create an instance with credentials
const auth = new AuthBasic({
	username: 'user',
	password: 'pass'
});

// Authenticate a request
const headers = new Headers({
	authorization: `Basic ${btoa('user:pass')}`
});

try {
	await auth.authenticate(headers);
	console.log('Authentication successful');
} catch (error) {
	console.error('Authentication failed:', error);
}
```

### Bearer Authentication

```typescript
import AuthBearer from 'use-request-utils/auth-bearer';

// Single token authentication
const auth = new AuthBearer({
	token: 'your-secure-token'
});

// Multiple tokens
const multiAuth = new AuthBearer({
	token: ['token1', 'token2']
});

// Custom token validation
const customAuth = new AuthBearer({
	token: async token => {
		// Validate token against a service
		return token === (await fetchValidToken());
	}
});
```

### JWT Authentication

```typescript
import AuthJwt from 'use-request-utils/auth-jwt';

// Create a JWT auth instance
const auth = new AuthJwt({
	secret: 'your-secret-key',
	// Optional configuration
	expires: { days: 7 },
	notBefore: { minutes: 5 },
	// Cookie settings if using cookies
	cookie: 'auth_token'
});

// Sign a new token
const { headers, payload, token } = await auth.sign({
	userId: 123,
	role: 'admin'
});

// Verify and authenticate
const { payload } = await auth.authenticate(headers);

// Destroy the session
const { headers } = await auth.destroy();
```

### Cookie Management

```typescript
import cookies from 'use-request-utils/cookies';

// Get a cookie from headers
const value = cookies.get(headers, 'cookie-name');

// Set a cookie
headers = cookies.set(headers, 'cookie-name', 'cookie-value', {
	maxAge: 3600,
	path: '/',
	httpOnly: true,
	secure: true
});

// Working with signed cookies
const signedValue = await cookies.getSigned(headers, 'cookie-name', 'signing-secret');
headers = await cookies.setSigned(headers, 'cookie-name', 'value', 'signing-secret');

// Delete a cookie
headers = cookies.del(headers, 'cookie-name');
```

### Headers Management

```typescript
import headers from 'use-request-utils/headers';

// Create Headers from a JSON object
const myHeaders = headers.fromJson({
	'content-type': 'application/json',
	'x-api-key': 'your-api-key'
});

// Merge multiple headers together
const mergedHeaders = headers.merge({ authorization: 'Bearer token123' }, new Headers({ 'content-type': 'application/json' }), {
	'x-custom-header': 'custom-value'
});
// Result combines all headers, with later values overriding earlier ones

// Convert Headers instance to a plain JavaScript object
const headersObj = headers.toJson(myHeaders);
// Result: { 'content-type': 'application/json', 'x-api-key': 'your-api-key' }
```

### Request Builder Usage

```typescript
import requestBuilder from 'use-request-utils/request-builder';

// Simple GET request with query parameters
const getRequest = requestBuilder('https://api.example.com/users', {
	query: {
		page: '1',
		limit: '10',
		tags: ['active', 'verified'] // Array parameters are supported
	}
});
// Result: https://api.example.com/users?page=1&limit=10&tags=active&tags=verified

// POST request with JSON body
const jsonRequest = requestBuilder('https://api.example.com/users', {
	method: 'POST',
	json: {
		name: 'John Doe',
		email: 'john@example.com'
	}
});
// Sets content-type: application/json automatically

// POST request with form data
const formRequest = requestBuilder('https://api.example.com/upload', {
	method: 'POST',
	form: {
		username: 'johndoe',
		files: ['file1.jpg', 'file2.jpg'] // Multiple values for the same field
	}
});

// Request with cookies
const cookieRequest = requestBuilder('https://api.example.com/dashboard', {
	cookies: {
		session: 'abc123',
		preference: 'darkmode'
	}
});

// Request with custom headers and abort controller
const controller = new AbortController();
const requestWithHeaders = requestBuilder('https://api.example.com/protected', {
	headers: {
		'api-key': 'secret-key',
		'accept-language': 'en-US'
	},
	signal: controller.signal
});

// Fetch with the created request
fetch(getRequest)
	.then(response => response.json())
	.then(data => console.log(data));
```

### Router Usage

```typescript
import Router from 'use-request-utils/router';

// Create a router instance
const router = new Router<YourHandlerType>();

// Add routes
router.add('GET', '/users', handleGetUsers);
router.add('POST', '/users', handleCreateUser);
router.add('GET', '/users/:id', handleGetUserById);
router.add('PUT', '/users/:id', handleUpdateUser);
router.add('DELETE', '/users/:id', handleDeleteUser);

// Add route with pattern matching
router.add('GET', '/articles/:slug{[a-z0-9-]+}', handleGetArticle);

// Add route with optional parameter
router.add('GET', '/products/:category?', handleGetProducts);

// Add catch-all route
router.add('ALL', '*', handleNotFound);

// Match a path
const handlers = router.match('GET', '/users/123');
// Returns: [{ handler: handleGetUserById, pathParams: { id: 123 }, rawPath: '/users/:id' }]

// Path parameters are automatically inferred to the correct type
// Numbers are converted to numbers, booleans to booleans, etc.
```

## API Reference

### Auth Classes

#### AuthBasic

```typescript
new AuthBasic(options: {
  header?: string;  // Custom header name, defaults to 'authorization'
  username: string;
  password: string;
})

// Methods
authenticate(headers: Headers): Promise<void>
```

#### AuthBearer

```typescript
new AuthBearer(options: {
  header?: string;  // Custom header name, defaults to 'authorization'
  token: string | string[] | ((token: string) => boolean | Promise<boolean>);
  hashFunction?: (a: any) => Promise<string | null>;
})

// Methods
authenticate(headers: Headers): Promise<void>
```

#### AuthJwt

```typescript
new AuthJwt(options: {
  // JWT algorithm to use
  alg?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';

  // Cookie configuration
  cookie?: string | {
    name: string;
    secret?: string; // Secret for signing the cookie
    options?: {
      domain?: string;
      expires?: Date;
      httpOnly?: boolean;
      maxAge?: number;
      path?: string;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none';
      partitioned?: boolean;
      prefix?: 'host' | 'secure';
    }
  };

  // Token encryption
  encrypt?: boolean | {
    enc: 'A128GCM' | 'A192GCM' | 'A256GCM' // Encryption algorithm
  };

  // Token expiration
  expires?: {
    days?: number;
    hours?: number;
    minutes?: number
  };

  // Custom header name (default: 'authorization')
  header?: string;

  // Token activation delay
  notBefore?: {
    days?: number;
    hours?: number;
    minutes?: number
  };

  // The secret key (required)
  secret: string | JsonWebKey | CryptoKey;
})

// Methods
authenticate<P = any>(input: Headers | string, revalidate?: boolean): Promise<AuthJwt.Response<P>>
destroy(): Promise<AuthJwt.Response<null>>
sign<P = any>(payload: Jwt.Payload<P>, revalidateExpires?: Date): Promise<AuthJwt.Response<P> & { token: string }>

// Response type
type Response<T> = {
  headers: Headers;    // Response headers (with authorization or set-cookie)
  payload: Jwt.Payload<T> | null;  // Token payload or null if destroyed
  token?: string;      // JWT token (only for sign method)
};
```

### Cookie Utilities

```typescript
// Get cookies
get(headers: Headers, name: string, prefix?: 'secure' | 'host'): string
getAll(headers: Headers): Record<string, string>
getSigned(headers: Headers, name: string, secret: string, prefix?: 'secure' | 'host'): Promise<string>
getAllSigned(headers: Headers, secret: string): Promise<Record<string, string | false>>

// Set cookies
set(headers: Headers, name: string, value: string, options?: CookieOptions): Headers
setSigned(headers: Headers, name: string, value: string, secret: string, options?: CookieOptions): Promise<Headers>

// Delete cookies
del(headers: Headers, name: string, options?: CookieOptions): Headers
```

### Headers Utilities

```typescript
// Create Headers from a JSON object
fromJson(json: HeadersInit): Headers

// Merge multiple headers
merge(...sources: (HeadersInit | null | undefined)[]): Headers

// Convert Headers to a JSON object
toJson(headers: Headers): Record<string, string>
```

### JWT Utilities

```typescript
// Create JWT tokens
sign<P = any, H = any>(payload: Jwt.Payload<P>, secret: string | JsonWebKey | CryptoKey, options?: Jwt.SignOptions<H>): Promise<string>

// Verify JWT tokens
verify<P = any, H = any>(token: string, secret: string | JsonWebKey | CryptoKey, options?: Jwt.VerifyOptions): Promise<Jwt.Data<P, H>>

// Decode JWT tokens (without verification)
decode<P = any, H = any>(token: string): Jwt.Data<P, H>
```

### Request Builder

```typescript
requestBuilder(input: string, options?: RequestBuilder.Options): Request

// Options type
type Options = {
  // Raw body (string, FormData, or plain object that will be JSON-serialized)
  body?: BodyInit | Record<string, unknown>;

  // Cookies to include in the request as cookie header
  cookies?: Record<string, string>;

  // Form data (FormData instance or record of field values)
  form?: FormData | Record<string, string | string[]>;

  // Request headers
  headers?: HeadersInit | null | undefined;

  // JSON body (automatically sets content-type: application/json)
  json?: Record<string, unknown>;

  // HTTP method (default: 'GET')
  method?: string;

  // Query parameters to append to the URL
  query?: Record<string, string | string[]>;

  // AbortSignal for cancellation
  signal?: AbortSignal;
};
```

### Router

```typescript
// Create a router
const router = new Router<T>();

// Add a route
router.add(method: string, path: string, handler: T): void

// Match a path, returns array of matches
router.match(method: string, path: string): Array<{
  handler: T;
  pathParams: Record<string, unknown>;
  rawPath: string;
}>

// Path patterns:
// - Static paths: '/users', '/articles'
// - Path parameters: '/users/:id', '/articles/:category/:slug'
// - Pattern matching: '/users/:id{\\d+}', '/articles/:slug{[a-z0-9-]+}'
// - Optional parameters: '/products/:category?'
// - Wildcard: '/*', '*'
```

### Path Parameter Features

- **Automatic type inference**: Path parameters are automatically converted to their corresponding JavaScript types
  - Numbers: `/users/123` → `{ id: 123 }`
  - Booleans: `/settings/true` → `{ enabled: true }`
  - Strings: `/users/john` → `{ username: "john" }`
- **Pattern matching**: Define patterns for path parameters using regular expressions
  - `'/users/:id{\\d+}'` - Only matches numeric IDs
  - `'/articles/:slug{[a-z0-9-]+}'` - Only matches slugs with lowercase letters, numbers, and hyphens
- **Optional parameters**: Make path parameters optional with the `?` suffix
  - `'/products/:category?'` - Matches both `/products` and `/products/electronics`

## Testing

This package includes comprehensive tests. Run them with:

```bash
yarn test
```

For coverage information:

```bash
yarn test:coverage
```

## Author

**Felipe Rohde**

- Email: feliperohdee@gmail.com
- GitHub: [@feliperohdee](https://github.com/feliperohdee)

## License

[MIT](LICENSE)
