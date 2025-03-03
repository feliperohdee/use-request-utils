# use-request-utils

A lightweight, browser-compatible collection of utilities for handling web request authentication, cookies, JWT tokens, and cryptographic operations.

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
- [Usage Examples](#usage-examples)
  - [Basic Authentication](#basic-authentication)
  - [Bearer Authentication](#bearer-authentication)
  - [JWT Authentication](#jwt-authentication)
  - [Cookie Management](#cookie-management)
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

### JWT Utilities

```typescript
// Create JWT tokens
sign<P = any, H = any>(payload: Jwt.Payload<P>, secret: string | JsonWebKey | CryptoKey, options?: Jwt.SignOptions<H>): Promise<string>

// Verify JWT tokens
verify<P = any, H = any>(token: string, secret: string | JsonWebKey | CryptoKey, options?: Jwt.VerifyOptions): Promise<Jwt.Data<P, H>>

// Decode JWT tokens (without verification)
decode<P = any, H = any>(token: string): Jwt.Data<P, H>
```

#### JWT Options

```typescript
// Standard JWT payload properties
type Payload<T = any> = {
	iss?: string; // Issuer
	sub?: string; // Subject
	aud?: string | string[]; // Audience
	exp?: number; // Expiration Time
	nbf?: number; // Not Before
	iat?: number; // Issued At
	jti?: string; // JWT ID
} & T; // Custom claims

// Algorithms supported
type Algorithm = 'ES256' | 'ES384' | 'ES512' | 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

// Sign options
type SignOptions<T> = {
	alg?: Algorithm; // Algorithm to use (default: 'HS256')
	encrypt?: boolean | { enc: 'A128GCM' | 'A192GCM' | 'A256GCM' }; // Enable encryption
	header?: {
		// Custom header claims
		type?: string; // Token type (default: 'JWT')
		[key: string]: any;
	};
};

// Verify options
type VerifyOptions = {
	alg?: Algorithm; // Expected algorithm (default: 'HS256')
	clockTolerance?: number; // Seconds to tolerate for clock skew
	decrypt?: boolean; // Whether to decrypt the token
};
```

### Cryptographic Utilities

```typescript
// Hashing
sha256(data: string | boolean | number | object | ArrayBufferView | ArrayBuffer | ReadableStream): Promise<string | null>
sha1(data: string | boolean | number | object | ArrayBufferView | ArrayBuffer | ReadableStream): Promise<string | null>

// Timing-safe comparison
timingSafeEqual(a: string | object | boolean, b: string | object | boolean, hashFunction?: (a: any) => Promise<string | null>): Promise<boolean>
```

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
