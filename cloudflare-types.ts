type CfProperties<HostMetadata = unknown> = {
	// Properties from IncomingRequestCfProperties

	/**
	 * [ASN](https://www.iana.org/assignments/as-numbers/as-numbers.xhtml) of the incoming request.
	 * @example 395747
	 */
	asn?: number;

	/**
	 * The organization which owns the ASN of the incoming request.
	 * @example "Google Cloud"
	 */
	asOrganization?: string;

	/**
	 * The original value of the `Accept-Encoding` header if Cloudflare modified it.
	 * @example "gzip, deflate, br"
	 */
	clientAcceptEncoding?: string;

	/**
	 * The number of milliseconds it took for the request to reach your worker.
	 * @example 22
	 */
	clientTcpRtt?: number;

	/**
	 * The three-letter [IATA](https://en.wikipedia.org/wiki/IATA_airport_code)
	 * airport code of the data center that the request hit.
	 * @example "DFW"
	 */
	colo?: string;

	/**
	 * Represents the upstream's response to a
	 * [TCP `keepalive` message](https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/overview.html)
	 * from cloudflare.
	 *
	 * For workers with no upstream, this will always be `1`.
	 * @example 3
	 */
	edgeRequestKeepAliveStatus?: number;

	/**
	 * The HTTP Protocol the request used.
	 * @example "HTTP/2"
	 */
	httpProtocol?: string;

	/**
	 * The browser-requested prioritization information in the request object.
	 * If no information was set, defaults to the empty string `""`
	 * @example "weight=192;exclusive=0;group=3;group-weight=127"
	 * @default ""
	 */
	requestPriority?: string;

	/**
	 * The TLS version of the connection to Cloudflare.
	 * In requests served over plaintext (without TLS), this property is the empty string `""`.
	 * @example "TLSv1.3"
	 */
	tlsVersion?: string;

	/**
	 * The cipher for the connection to Cloudflare.
	 * In requests served over plaintext (without TLS), this property is the empty string `""`.
	 * @example "AEAD-AES128-GCM-SHA256"
	 */
	tlsCipher?: string;

	/**
	 * Metadata containing the [`HELLO`](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.1.2) and [`FINISHED`](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.9) messages from this request's TLS handshake.
	 * If the incoming request was served over plaintext (without TLS) this field is undefined.
	 */
	tlsExportedAuthenticator?: {
		/**
		 * The client's [`HELLO` message](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.1.2), encoded in hexadecimal
		 * @example "44372ba35fa1270921d318f34c12f155dc87b682cf36a790cfaa3ba8737a1b5d"
		 */
		clientHandshake: string;

		/**
		 * The server's [`HELLO` message](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.1.2), encoded in hexadecimal
		 * @example "44372ba35fa1270921d318f34c12f155dc87b682cf36a790cfaa3ba8737a1b5d"
		 */
		serverHandshake: string;

		/**
		 * The client's [`FINISHED` message](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.9), encoded in hexadecimal
		 * @example "084ee802fe1348f688220e2a6040a05b2199a761f33cf753abb1b006792d3f8b"
		 */
		clientFinished: string;

		/**
		 * The server's [`FINISHED` message](https://www.rfc-editor.org/rfc/rfc5246#section-7.4.9), encoded in hexadecimal
		 * @example "084ee802fe1348f688220e2a6040a05b2199a761f33cf753abb1b006792d3f8b"
		 */
		serverFinished: string;
	};

	// Bot Management properties
	/**
	 * Cloudflare's Bot Management analysis results
	 */
	botManagement?: {
		/**
		 * Cloudflare's [level of certainty](https://developers.cloudflare.com/bots/concepts/bot-score/) that a request comes from a bot,
		 * represented as an integer percentage between `1` (almost certainly a bot) and `99` (almost certainly human).
		 * @example 54
		 */
		score: number;

		/**
		 * A boolean value that is true if the request comes from a good bot, like Google or Bing.
		 * Most customers choose to allow this traffic.
		 */
		verifiedBot: boolean;

		/**
		 * A boolean value that is true if the request originates from a
		 * Cloudflare-verified proxy service.
		 */
		corporateProxy: boolean;

		/**
		 * A boolean value that's true if the request matches [file extensions](https://developers.cloudflare.com/bots/reference/static-resources/) for many types of static resources.
		 */
		staticResource: boolean;

		/**
		 * List of IDs that correlate to the Bot Management heuristic detections made on a request (you can have multiple heuristic detections on the same request).
		 */
		detectionIds: number[];

		/**
		 * A [JA3 Fingerprint](https://developers.cloudflare.com/bots/concepts/ja3-fingerprint/) to help profile specific SSL/TLS clients
		 * across different destination IPs, Ports, and X509 certificates.
		 * (Only in Enterprise)
		 */
		ja3Hash?: string;
	};

	/**
	 * Duplicate of `botManagement.score`.
	 * @deprecated
	 */
	clientTrustScore?: number;

	/**
	 * Custom metadata set per-host in [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/).
	 * This field is only present if you have Cloudflare for SaaS enabled on your account.
	 */
	hostMetadata?: HostMetadata;

	// Geographic data
	/**
	 * The [ISO 3166-1 Alpha 2](https://www.iso.org/iso-3166-country-codes.html) country code the request originated from.
	 * If your worker is [configured to accept TOR connections](https://support.cloudflare.com/hc/en-us/articles/203306930-Understanding-Cloudflare-Tor-support-and-Onion-Routing), this may also be `"T1"`, indicating a request that originated over TOR.
	 * If Cloudflare is unable to determine where the request originated this property is omitted.
	 * @example "GB"
	 */
	country?: string;

	/**
	 * If present, this property indicates that the request originated in the EU
	 * @example "1"
	 */
	isEUCountry?: '1';

	/**
	 * A two-letter code indicating the continent the request originated from.
	 * @example "AN"
	 */
	continent?: string;

	/**
	 * The city the request originated from
	 * @example "Austin"
	 */
	city?: string;

	/**
	 * Postal code of the incoming request
	 * @example "78701"
	 */
	postalCode?: string;

	/**
	 * Latitude of the incoming request
	 * @example "30.27130"
	 */
	latitude?: string;

	/**
	 * Longitude of the incoming request
	 * @example "-97.74260"
	 */
	longitude?: string;

	/**
	 * Timezone of the incoming request
	 * @example "America/Chicago"
	 */
	timezone?: string;

	/**
	 * If known, the ISO 3166-2 name for the first level region associated with
	 * the IP address of the incoming request
	 * @example "Texas"
	 */
	region?: string;

	/**
	 * If known, the ISO 3166-2 code for the first-level region associated with
	 * the IP address of the incoming request
	 * @example "TX"
	 */
	regionCode?: string;

	/**
	 * Metro code (DMA) of the incoming request
	 * @example "635"
	 */
	metroCode?: string;

	// TLS Client Auth
	/**
	 * Information about the client certificate presented to Cloudflare.
	 * This is populated when the incoming request is served over TLS using
	 * either Cloudflare Access or API Shield (mTLS)
	 */
	tlsClientAuth?: {
		/** Whether a certificate was presented */
		certPresented: '0' | '1';

		/**
		 * Result of certificate verification.
		 * @example "FAILED:self signed certificate"
		 */
		certVerified: string;

		/** The presented certificate's revokation status.
		 * - A value of `"1"` indicates the certificate has been revoked
		 * - A value of `"0"` indicates the certificate has not been revoked
		 */
		certRevoked: '0' | '1';

		/**
		 * The certificate issuer's distinguished name
		 * @example "CN=cloudflareaccess.com, C=US, ST=Texas, L=Austin, O=Cloudflare"
		 */
		certIssuerDN: string;

		/**
		 * The certificate subject's distinguished name
		 * @example "CN=*.cloudflareaccess.com, C=US, ST=Texas, L=Austin, O=Cloudflare"
		 */
		certSubjectDN: string;

		/**
		 * The certificate issuer's distinguished name (RFC 2253 formatted)
		 * @example "CN=cloudflareaccess.com, C=US, ST=Texas, L=Austin, O=Cloudflare"
		 */
		certIssuerDNRFC2253: string;

		/**
		 * The certificate subject's distinguished name (RFC 2253 formatted)
		 * @example "CN=*.cloudflareaccess.com, C=US, ST=Texas, L=Austin, O=Cloudflare"
		 */
		certSubjectDNRFC2253: string;

		/** The certificate issuer's distinguished name (legacy policies) */
		certIssuerDNLegacy: string;

		/** The certificate subject's distinguished name (legacy policies) */
		certSubjectDNLegacy: string;

		/**
		 * The certificate's serial number
		 * @example "00936EACBE07F201DF"
		 */
		certSerial: string;

		/**
		 * The certificate issuer's serial number
		 * @example "2489002934BDFEA34"
		 */
		certIssuerSerial: string;

		/**
		 * The certificate's Subject Key Identifier
		 * @example "BB:AF:7E:02:3D:FA:A6:F1:3C:84:8E:AD:EE:38:98:EC:D9:32:32:D4"
		 */
		certSKI: string;

		/**
		 * The certificate issuer's Subject Key Identifier
		 * @example "BB:AF:7E:02:3D:FA:A6:F1:3C:84:8E:AD:EE:38:98:EC:D9:32:32:D4"
		 */
		certIssuerSKI: string;

		/**
		 * The certificate's SHA-1 fingerprint
		 * @example "6b9109f323999e52259cda7373ff0b4d26bd232e"
		 */
		certFingerprintSHA1: string;

		/**
		 * The certificate's SHA-256 fingerprint
		 * @example "acf77cf37b4156a2708e34c4eb755f9b5dbbe5ebb55adfec8f11493438d19e6ad3f157f81fa3b98278453d5652b0c1fd1d71e5695ae4d709803a4d3f39de9dea"
		 */
		certFingerprintSHA256: string;

		/**
		 * The effective starting date of the certificate
		 * @example "Dec 22 19:39:00 2018 GMT"
		 */
		certNotBefore: string;

		/**
		 * The effective expiration date of the certificate
		 * @example "Dec 22 19:39:00 2018 GMT"
		 */
		certNotAfter: string;
	};

	/**
	 * Any custom properties that aren't covered in the types above
	 */
	[key: string]: unknown;
};

export type { CfProperties };
