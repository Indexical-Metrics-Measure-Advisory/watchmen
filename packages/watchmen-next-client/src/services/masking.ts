import { MaskingPolicy, OntologyAttribute } from "../models";

// Masking rule engine for the ontology data preview. Output shapes mirror the
// backend ontology query API (watchmen-metricflow/ontology/factor_mask_policy.py)
// so the preview shows exactly what `POST /ontology/{id}/query` would return
// for a non-admin principal.

export type MaskStrategy = MaskingPolicy["strategy"];

// The policy governing an attribute: explicit maskedBy link wins (kept even
// when disabled, so governance can flag "policy disabled"); otherwise any
// policy targeting the attribute's (topic, factor).
export const findMaskingPolicy = (attribute: OntologyAttribute, policies: MaskingPolicy[]): MaskingPolicy | null => {
	if (attribute.maskedBy) {
		return policies.find((p) => p.policyId === attribute.maskedBy) || null;
	}
	return (
		policies.find(
			(p) =>
				p.enabled &&
				p.targetTopic === attribute.sourceTopic &&
				p.targetFactor === attribute.sourceFactor,
		) || null
	);
};

// Strategy actually applied to values: only enabled policies mask.
export const resolveMaskStrategy = (attribute: OntologyAttribute, policies: MaskingPolicy[]): MaskStrategy | null => {
	const policy = findMaskingPolicy(attribute, policies);
	return policy && policy.enabled ? policy.strategy : null;
};

export const maskValue = (value: string, strategy: MaskStrategy): string => {
	switch (strategy) {
		case "partial_mask":
			return maskPartial(value);
		case "sha256":
			return sha256Hex(value);
		case "redact":
			return "***";
		case "tokenize":
			// Deterministic pseudonym: same input always yields the same token.
			return `TKN-${sha256Hex(value).slice(0, 8).toUpperCase()}`;
		default:
			return value;
	}
};

// Mirrors the backend MASK_MAIL shape: keep @domain, hide the local part.
const maskPartial = (value: string): string => {
	const at = value.indexOf("@");
	if (at > 0) return `*****${value.slice(at)}`;
	return maskCenter(value, 5);
};

// Mirrors the backend MASK_CENTER_5 shape: keep the edges, mask the middle
// 5 characters (the backend masks central digit segments; for display shapes
// masking the central characters is visually equivalent).
const maskCenter = (value: string, digits: number): string => {
	const length = value.length;
	if (length <= digits) return "*".repeat(length);
	const keep = length - digits;
	const head = Math.ceil(keep / 2);
	const tail = keep - head;
	return `${value.slice(0, head)}${"*".repeat(digits)}${tail > 0 ? value.slice(length - tail) : ""}`;
};

// Synchronous SHA-256 producing 64-char lowercase hex, matching the backend
// SHA256Encryptor output. Web Crypto's digest is async while the preview
// renders through synchronous string templates, so the algorithm is inlined.
const SHA256_K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

const toHex8 = (n: number): string => (n >>> 0).toString(16).padStart(8, "0");

const sha256Hex = (text: string): string => {
	const bytes = new TextEncoder().encode(text);
	// Padded length: message + 0x80 + 8-byte length, rounded up to a 64-byte block.
	const totalLength = ((bytes.length + 9 + 63) >> 6) << 6;
	const buffer = new Uint8Array(totalLength);
	buffer.set(bytes);
	buffer[bytes.length] = 0x80;
	const view = new DataView(buffer.buffer);
	// Input sizes here are far below 2^32 bits, so the high length word stays 0.
	view.setUint32(totalLength - 4, bytes.length * 8, false);

	let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
	let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

	const w = new Uint32Array(64);
	for (let offset = 0; offset < totalLength; offset += 64) {
		for (let i = 0; i < 16; i++) {
			w[i] = view.getUint32(offset + i * 4, false);
		}
		for (let i = 16; i < 64; i++) {
			const x = w[i - 15];
			const y = w[i - 2];
			const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
			const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
		}
		let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
		for (let i = 0; i < 64; i++) {
			const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = (e & f) ^ (~e & g);
			const t1 = (h + s1 + ch + SHA256_K[i] + w[i]) | 0;
			const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (s0 + maj) | 0;
			h = g;
			g = f;
			f = e;
			e = (d + t1) | 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) | 0;
		}
		h0 = (h0 + a) | 0;
		h1 = (h1 + b) | 0;
		h2 = (h2 + c) | 0;
		h3 = (h3 + d) | 0;
		h4 = (h4 + e) | 0;
		h5 = (h5 + f) | 0;
		h6 = (h6 + g) | 0;
		h7 = (h7 + h) | 0;
	}
	return [h0, h1, h2, h3, h4, h5, h6, h7].map(toHex8).join("");
};
