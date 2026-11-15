/**
 * Preview password gate for Cloudflare Pages.
 *
 * Runs before every request, including images, scripts and the lead API,
 * so nothing on the site is reachable without the password.
 *
 *   SITE_PASSWORD        secret. The password visitors must enter.
 *   PUBLIC_LAUNCH_READY  set to "true" to open the site to the public.
 *
 * It fails closed: if the site is not launch-ready and no password is
 * configured, every request gets a 503 instead of the site.
 */
interface Env {
  SITE_PASSWORD?: string;
  PUBLIC_LAUNCH_READY?: string;
}
interface Context {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

const COOKIE = 'igc_preview';
const LOGIN_PATH = '/__preview';
const MAX_AGE = 60 * 60 * 24 * 30;

async function tokenFor(password: string) {
  const data = new TextEncoder().encode(`${password}:idahogate-preview-v1`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison so response timing does not leak the token. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

const safeNext = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith(LOGIN_PATH) ? value : '/');

const baseHeaders = {
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'cache-control': 'no-store',
  'referrer-policy': 'same-origin',
};

function page(body: string, status: number) {
  return new Response(
    `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Private preview | Idaho Gate Co.</title><style>
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{background:#131415;color:#ece8df;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;display:grid;place-items:center;padding:24px;
background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:48px 48px}
main{width:100%;max-width:26rem;border:1px solid rgba(255,255,255,.14);background:#131415;padding:2rem;position:relative}
main:before{content:"";position:absolute;top:-1px;left:-1px;width:14px;height:14px;border-top:2px solid #c2561f;border-left:2px solid #c2561f}
.k{font:500 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#e0703a;margin:0 0 1rem}
h1{font-size:1.6rem;line-height:1.1;margin:0 0 .6rem;text-transform:uppercase;letter-spacing:.01em}
p{margin:0 0 1.4rem;color:#a6abb2}
label{display:block;font:500 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.5rem}
input{width:100%;min-height:3rem;padding:.7rem .9rem;font:inherit;color:#ece8df;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.25);border-radius:2px}
input:focus{outline:2px solid #e0703a;outline-offset:2px}
button{margin-top:1rem;width:100%;min-height:3rem;font:600 .82rem/1 inherit;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:#a9481a;border:0;border-radius:2px;cursor:pointer}
button:hover{background:#8f3b13}button:focus-visible{outline:2px solid #e0703a;outline-offset:3px}
.e{color:#ff9c8a;margin:1rem 0 0}
</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { ...baseHeaders, 'content-type': 'text/html; charset=utf-8' } },
  );
}

const loginPage = (next: string, error = '', status = 401) =>
  page(
    `<p class="k">Idaho Gate Co. · Private preview</p><h1>This site is not public yet.</h1><p>Enter the preview password to continue.</p>
<form method="post" action="${LOGIN_PATH}"><input type="hidden" name="next" value="${next.replace(/"/g, '&quot;')}">
<label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Enter preview</button>${error ? `<p class="e" role="alert">${error}</p>` : ''}</form>`,
    status,
  );

export const onRequest = async ({ request, env, next }: Context): Promise<Response> => {
  // Public release: the gate steps aside completely.
  if (env.PUBLIC_LAUNCH_READY === 'true') return next();

  const password = (env.SITE_PASSWORD || '').trim();
  if (!password) {
    return page(
      '<p class="k">Idaho Gate Co. · Private preview</p><h1>Preview is locked.</h1><p>No preview password is configured, so the site stays closed. Set the SITE_PASSWORD secret on the Cloudflare Pages project.</p>',
      503,
    );
  }

  const url = new URL(request.url);
  const expected = await tokenFor(password);

  if (url.pathname === LOGIN_PATH) {
    if (request.method === 'POST') {
      const form = await request.formData().catch(() => null);
      const supplied = String(form?.get('password') || '');
      const target = safeNext(String(form?.get('next') || '/'));
      if (safeEqual(await tokenFor(supplied), expected)) {
        return new Response(null, {
          status: 303,
          headers: {
            ...baseHeaders,
            location: target,
            'set-cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      // Slow down guessing a little.
      await new Promise((r) => setTimeout(r, 600));
      return loginPage(target, 'That password is not right. Try again.');
    }
    if (url.searchParams.has('logout')) {
      return new Response(null, { status: 303, headers: { ...baseHeaders, location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
    }
    return loginPage(safeNext(url.searchParams.get('next')), '', 200);
  }

  if (safeEqual(readCookie(request, COOKIE), expected)) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('x-robots-tag', baseHeaders['x-robots-tag']);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  // Not signed in. Pages get the form. Everything else gets a plain 401.
  const wantsHtml = request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html');
  if (wantsHtml) return loginPage(safeNext(url.pathname + url.search));
  return new Response('Preview password required.', { status: 401, headers: { ...baseHeaders, 'content-type': 'text/plain; charset=utf-8' } });
};
