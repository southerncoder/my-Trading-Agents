// Diagnoses Reddit credential problems WITHOUT printing any secret values.
// Run: docker cp this file into the container's /tmp, then: node /tmp/reddit-auth-check.mjs
import { readFileSync, existsSync } from 'fs';

const read = n => (existsSync(`/run/secrets/${n}`) ? readFileSync(`/run/secrets/${n}`, 'utf8').trim() : '');
const id = read('reddit_client_id');
const secret = read('reddit_client_secret');
const user = read('reddit_username');
const pass = read('reddit_password');
const ua = read('reddit_user_agent') || 'trading-agents-social-check/0.1';

console.log(`client_id: ${id ? id.length + ' chars' : 'MISSING'} | client_secret: ${secret ? secret.length + ' chars' : 'MISSING'} | username: ${user ? 'set' : 'MISSING'} | password: ${pass ? 'set' : 'MISSING'}`);
console.log(`password contains ':' (2FA format) = ${pass.includes(':')}`);

const basic = Buffer.from(`${id}:${secret}`).toString('base64');
async function tryGrant(label, body) {
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    let j = {};
    try { j = await res.json(); } catch { /* non-JSON */ }
    const ok = !!j.access_token;
    console.log(`${label}: HTTP ${res.status} ${ok ? 'TOKEN ISSUED scope=' + j.scope : 'error=' + (j.error ?? j.message ?? 'none')}`);
    return ok;
  } catch (e) {
    console.log(`${label}: request failed: ${e.message}`);
    return false;
  }
}

const app = await tryGrant('client_credentials (app-only; tests client id/secret)', { grant_type: 'client_credentials' });
const pw = await tryGrant('password grant (what the service uses)', { grant_type: 'password', username: user, password: pass });
console.log(
  !app && !pw
    ? 'DIAGNOSIS: Reddit rejects the client id/secret pair (wrong values, revoked app, or app not approved).'
    : app && !pw
      ? 'DIAGNOSIS: client id/secret are valid; the username/password grant fails (wrong password, 2FA on, or app type is not "script").'
      : 'DIAGNOSIS: credentials work.'
);
