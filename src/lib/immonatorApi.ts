import { getToken, getUserId, logout } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ── Shared types ───────────────────────────────────────────────────────────────

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export interface PropertyFilters {
  city?:         string;
  minPrice?:     number;
  maxPrice?:     number;
  minRooms?:     number;
  propertyType?: string;
  page?:         number;
  limit?:        number;
  sort?:         string;
}

export interface ScenarioParams {
  purchase_price?:   number;
  down_payment_pct?: number;
  interest_rate?:    number;
  loan_term_years?:  number;
  monthly_rent?:     number;
  vacancy_rate?:     number;
  management_fee?:   number;
  maintenance_pct?:  number;
  [key: string]: unknown;
}

export interface UserProfileData {
  display_name?:   string;
  equity?:         number;
  monthly_income?: number;
  monthly_expenses?: number;
  risk_style?:     string;
  hold_period?:    string;
  goal?:           string;
  cities?:         string[];
  property_types?: string[];
  [key: string]: unknown;
}

// ── Core helpers ───────────────────────────────────────────────────────────────

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token  = getToken();
  const userId = getUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token)  headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['X-User-ID']     = userId;
  return headers;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(options.headers as Record<string, string>),
    });
  } catch {
    return { data: null, error: 'Network error. Please try again.' };
  }

  if (response.status === 401) {
    logout();
    return { data: null, error: 'Session expired. Please log in again.' };
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch { /* ignore */ }
    return { data: null, error: message };
  }

  try {
    const data: T = await response.json();
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to parse server response.' };
  }
}

// Separate helper for endpoints that return a raw Response (streaming).
function rawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers as Record<string, string>),
  });
}

function toParams(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export function betaLogin(betaCode: string, displayName?: string) {
  return apiCall<{ token: string; user_id: string; display_name: string }>(
    '/api/auth/beta-login',
    {
      method: 'POST',
      body:   JSON.stringify({ beta_code: betaCode, display_name: displayName }),
    },
  );
}

export function refreshToken() {
  return apiCall<{ token: string }>('/api/auth/refresh', { method: 'POST' });
}

export function getMe() {
  return apiCall<{ user_id: string; display_name: string }>('/api/auth/me');
}

// ── Properties ─────────────────────────────────────────────────────────────────

export function fetchProperties(filters: PropertyFilters = {}) {
  const query = toParams({
    city:          filters.city,
    min_price:     filters.minPrice,
    max_price:     filters.maxPrice,
    min_rooms:     filters.minRooms,
    property_type: filters.propertyType,
    page:          filters.page,
    limit:         filters.limit,
    sort_by:       filters.sort,
  });
  return apiCall<unknown[]>(`/api/properties${query}`);
}

export function fetchPropertyById(id: string) {
  return apiCall<unknown>(`/api/properties/${id}`);
}

export function fetchPropertyStats() {
  return apiCall<{ total_listings: number; total_cities: number }>(
    '/api/properties/stats',
  );
}

export function triggerScrape(city: string, maxPrice: number, minRooms: number) {
  return apiCall<{ job_id: string }>('/api/properties/scrape', {
    method: 'POST',
    body:   JSON.stringify({ city, max_price: maxPrice, min_rooms: minRooms }),
  });
}

// ── Portfolio ──────────────────────────────────────────────────────────────────

export function saveToPortfolio(propertyId: string) {
  return apiCall<unknown>(`/api/portfolio/watch/${propertyId}`, { method: 'POST' });
}

export function getPortfolio(status?: string) {
  const query = toParams({ status });
  return apiCall<unknown[]>(`/api/portfolio${query}`);
}

export function updatePortfolioStatus(
  propertyId:     string,
  status:         string,
  notes?:         string,
  purchasePrice?: number,
) {
  return apiCall<unknown>(`/api/portfolio/${propertyId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, notes, purchase_price: purchasePrice }),
  });
}

export function removeFromPortfolio(propertyId: string) {
  return apiCall<unknown>(`/api/portfolio/${propertyId}`, { method: 'DELETE' });
}

// ── Analysis ───────────────────────────────────────────────────────────────────

export function getCompactAnalysis(propertyId: string) {
  return apiCall<unknown>(`/api/analysis/compact/${propertyId}`);
}

export function triggerDeepAnalysis(propertyId: string) {
  return apiCall<{ job_id: string }>(`/api/analysis/deep/${propertyId}`, {
    method: 'POST',
  });
}

export function getDeepAnalysis(propertyId: string) {
  return apiCall<unknown>(`/api/analysis/deep/${propertyId}`);
}

export function getMarketStats(city: string) {
  return apiCall<unknown>(`/api/analysis/market/${encodeURIComponent(city)}/stats`);
}

export function getMarketAnalysis(city: string, propertyType?: string) {
  const query = toParams({ property_type: propertyType });
  return apiCall<unknown>(
    `/api/analysis/market/${encodeURIComponent(city)}${query}`,
  );
}

export function triggerPortfolioAnalysis() {
  return apiCall<{ job_id: string }>('/api/analysis/portfolio', { method: 'POST' });
}

export function getPortfolioAnalysis() {
  return apiCall<unknown>('/api/analysis/portfolio');
}

export function runScenario(propertyId: string, params: ScenarioParams) {
  return apiCall<unknown>(`/api/analysis/scenario/${propertyId}`, {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

export function saveScenario(
  propertyId: string,
  name:       string,
  params:     ScenarioParams,
) {
  return apiCall<unknown>(`/api/analysis/scenario/${propertyId}/save`, {
    method: 'POST',
    body:   JSON.stringify({ name, params }),
  });
}

export function getSavedScenarios(propertyId: string) {
  return apiCall<unknown[]>(`/api/analysis/scenario/${propertyId}/saved`);
}

// ── Strategy ───────────────────────────────────────────────────────────────────

export function generateStrategy() {
  return apiCall<unknown>('/api/strategy/generate', { method: 'POST' });
}

export function getStrategy() {
  return apiCall<unknown>('/api/strategy');
}

export function getStrategyMatches() {
  return apiCall<unknown[]>('/api/strategy/matches');
}

// ── Negotiation ────────────────────────────────────────────────────────────────

export function generateNegotiationBrief(propertyId: string) {
  return apiCall<unknown>(`/api/negotiation/${propertyId}`, { method: 'POST' });
}

export function getNegotiationBrief(propertyId: string) {
  return apiCall<unknown>(`/api/negotiation/${propertyId}`);
}

// ── Profile ────────────────────────────────────────────────────────────────────

export function getUserProfile() {
  return apiCall<unknown>('/api/users/profile');
}

export function saveUserProfile(data: UserProfileData) {
  return apiCall<unknown>('/api/users/profile', {
    method: 'PUT',
    body:   JSON.stringify(data),
  });
}

// ── Chat ───────────────────────────────────────────────────────────────────────

// Returns the raw Response so the caller can consume the ReadableStream directly.
export function sendChatMessage(
  message:     string,
  contextType: string,
  contextId?:  string,
): Promise<Response> {
  return rawFetch('/api/chat/stream', {
    method: 'POST',
    body:   JSON.stringify({ message, context_type: contextType, context_id: contextId }),
  });
}

export function getChatHistory(contextType: string, contextId?: string) {
  const query = toParams({ context_type: contextType, context_id: contextId });
  return apiCall<unknown[]>(`/api/chat/history${query}`);
}

export function clearChatHistory(contextType: string, contextId?: string) {
  const query = toParams({ context_type: contextType, context_id: contextId });
  return apiCall<unknown>(`/api/chat/history${query}`, { method: 'DELETE' });
}

// ── Feedback ───────────────────────────────────────────────────────────────────

export function submitFeedback(
  type:         string,
  content:      string,
  pageContext?: string,
  rating?:      number,
) {
  return apiCall<unknown>('/api/feedback', {
    method: 'POST',
    body:   JSON.stringify({ type, content, page_context: pageContext, rating }),
  });
}

export function joinWaitlist(email: string, feature: string) {
  return apiCall<unknown>('/api/waitlist', {
    method: 'POST',
    body:   JSON.stringify({ email, feature }),
  });
}
