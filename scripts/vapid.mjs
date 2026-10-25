// Generates a VAPID key pair for Web Push (base64url). Store both as Worker secrets.
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const b64u = (b) => Buffer.from(b).toString('base64url');
console.log(`VAPID_PUBLIC_KEY=${b64u(pub)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
