// Standalone replacement for the Base44 SDK client.
// It exposes the same surface the app already uses (entities, auth, functions),
// backed by the Node API in ../backend.

const API_BASE = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin)
).replace(/\/+$/, '');
const TOKEN_KEY = 'successionpath_token';

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error(`Cannot reach the API server at ${API_BASE}. Is the backend running?`);
    error.status = 0;
    throw error;
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

function encodeQuery(query) {
  return encodeURIComponent(JSON.stringify(query || {}));
}

function entityApi(name) {
  const base = `/api/entities/${name}`;

  const pageRequest = (query, options = {}) => {
    const params = new URLSearchParams();
    params.set('query', JSON.stringify(query || {}));
    if (options.sort) params.set('sort', options.sort);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', String(options.cursor));
    return request(`${base}?${params.toString()}`);
  };

  return {
    // filter(query) → array; filter(query, {sort, limit, cursor}) → {items, next_cursor, has_more}
    async filter(query = {}, options) {
      const page = await pageRequest(query, options || {});
      return options ? page : page.items;
    },

    // list('-created_date', 50) or list({sort, limit})
    async list(sortOrOptions, limit) {
      const options = typeof sortOrOptions === 'string' ? { sort: sortOrOptions, limit } : sortOrOptions || {};
      const page = await pageRequest({}, options);
      return page.items;
    },

    async count(query = {}) {
      const result = await request(`${base}/count?query=${encodeQuery(query)}`);
      return result.count;
    },

    async aggregate({ query = {}, groupBy, sum, avg, min, max, dateBucket } = {}) {
      const params = new URLSearchParams();
      params.set('query', JSON.stringify(query || {}));
      params.set('groupBy', groupBy);
      if (sum) params.set('sum', JSON.stringify(sum));
      if (avg) params.set('avg', JSON.stringify(avg));
      if (min) params.set('min', JSON.stringify(min));
      if (max) params.set('max', JSON.stringify(max));
      if (dateBucket) params.set('dateBucket', JSON.stringify(dateBucket));
      return request(`${base}/aggregate?${params.toString()}`);
    },

    async distinct(field, query = {}) {
      const result = await request(`${base}/distinct?field=${encodeURIComponent(field)}&query=${encodeQuery(query)}`);
      return { items: result.items };
    },

    get(id) {
      return request(`${base}/${encodeURIComponent(id)}`);
    },

    create(data) {
      return request(base, { method: 'POST', body: data });
    },

    bulkCreate(items) {
      return request(`${base}/bulk`, { method: 'POST', body: { items } });
    },

    update(id, data) {
      return request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },

    updateMany(query, update) {
      return request(`${base}/update-many`, { method: 'POST', body: { query, update } });
    },

    bulkUpdate(items) {
      return request(`${base}/bulk-update`, { method: 'POST', body: { items } });
    },

    delete(id) {
      return request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },

    deleteMany(query = {}) {
      return request(`${base}?query=${encodeQuery(query)}`, { method: 'DELETE' });
    },

    // Live updates are not wired in this build; pages load on mount as before.
    subscribe() {
      return () => {};
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(target, name) {
      if (typeof name !== 'string') return undefined;
      if (!target[name]) target[name] = entityApi(name);
      return target[name];
    },
  }
);

const auth = {
  getToken,
  setToken,

  async login(email, password) {
    const result = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    setToken(result.token);
    return result.user;
  },

  // Kept for compatibility with the previous auth flow naming.
  loginViaEmailPassword(email, password) {
    return auth.login(email, password);
  },

  async register({ email, password, full_name }) {
    const result = await request('/api/auth/register', { method: 'POST', body: { email, password, full_name } });
    setToken(result.token);
    return result.user;
  },

  me() {
    return request('/api/auth/me');
  },

  async isAuthenticated() {
    if (!getToken()) return false;
    try {
      await request('/api/auth/me');
      return true;
    } catch {
      return false;
    }
  },

  updateMe(data) {
    return request('/api/auth/me', { method: 'PUT', body: data });
  },

  logout(redirectUrl = '/login') {
    setToken(null);
    window.location.href = redirectUrl;
  },

  redirectToLogin(nextUrl) {
    const target = nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login';
    window.location.href = target;
  },
};

export const base44 = {
  entities,
  auth,
  functions: {
    // The pages read `response.data`, so the payload is wrapped the same way the previous SDK did.
    async invoke(name, payload) {
      const data = await request(`/api/functions/${name}`, { method: 'POST', body: payload });
      return { data, status: 200 };
    },
  },
  app: {
    async getPublicSettings() {
      return { id: 'successionpath-standalone', public_settings: {} };
    },
  },
  analytics: {
    track() {},
  },
};

export default base44;
