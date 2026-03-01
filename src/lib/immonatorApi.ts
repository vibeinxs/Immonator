import { getToken, getUserId, logout } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ── Primitives ──────────────────────────────────────────────────────────────

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export type Verdict          = 'strong_buy' | 'worth_analysing' | 'proceed_with_caution' | 'avoid';
export type MarketTemperature = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
export type PortfolioStatus  = 'watching' | 'analysing' | 'negotiating' | 'purchased' | 'rejected';

// ── Property models ─────────────────────────────────────────────────────────

export interface CompactAnalysis {
  verdict?:          Verdict;
  one_line_summary?: string;
  ertragswert?:      number;
  sachwert?:         number;
}

export interface Property {
  id:                string;
  url:               string;
  title?:            string;
  price?:            number;
  area_sqm?:         number;
  rooms?:            number;
  city?:             string;
  zip_code?:         string;
  image_url?:        string;
  gross_yield?:      number;
  price_per_sqm?:    number;
  days_listed?:      number;
  property_type?:    string;
  compact_analysis?: CompactAnalysis;
}

export interface PropertyDetail extends Property {
  net_yield?:             number;
  cap_rate?:              number;
  monthly_rent?:          number;
  description?:           string;
  address?:               string;
  district?:              string;
  year_built?:            number;
  floor?:                 number | string;
  heating?:               string;
  condition?:             string;
  energy_class?:          string;
  balcony?:               boolean;
  garden?:                boolean;
  parking?:               boolean;
  cellar?:                boolean;
  images?:                string[];
  price_history?:         Array<{ date: string; price: number }>;
  price_reductions?:      number;
  price_reduction_total?: number;
  bodenrichtwert?:        number;
  negotiate_brief?:       NegotiateBrief;
  is_watched?:            boolean;
}

// ── Analysis models ─────────────────────────────────────────────────────────

export interface CompactAnalysisData {
  status:            'not_generated' | 'ready';
  verdict?:          Verdict;
  confidence?:       number;
  one_line_summary?: string;
  positives?:        string[];
  risks?:            string[];
  generated_at?:     string;
}

export interface FinancingScenario {
  label:            'Conservative' | 'Moderate' | 'Aggressive';
  recommended_ltv:  number;
  monthly_payment:  number;
  monthly_cashflow: number;
  equity_needed:    number;
  is_recommended?:  boolean;
}

export interface DeepAnalysisData {
  status:                   'not_generated' | 'ready';
  verdict?:                 Verdict;
  headline?:                string;
  key_insight?:             string;
  bottom_line?:             string;
  strengths?:               string[];
  weaknesses?:              string[];
  hidden_costs?:            Array<{ item: string; estimated_cost: number }>;
  condition_analysis?:      string;
  avg_valuation?:           number;
  asking_price?:            number;
  is_fairly_priced?:        'fairly_priced' | 'overvalued' | 'undervalued';
  valuation_commentary?:    string[];
  bull_case?:               string;
  base_case?:               string;
  bear_case?:               string;
  value_add_opportunities?: string[];
  overall_risk_level?:      'low' | 'medium' | 'high';
  deal_breakers?:           string[];
  risks?:                   Array<{ description: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>;
  financing_scenarios?:     FinancingScenario[];
  kfw_programs?:            string[];
  financing_commentary?:    string;
  city_market_summary?:     string;
  neighbourhood_outlook?:   string;
  price_trend?:             string;
  macro_risk_factors?:      string[];
  recommended_action?:      'buy_now' | 'negotiate_then_buy' | 'watch_and_wait' | 'pass';
  recommended_offer_price?: number;
  due_diligence_checklist?: string[];
  next_steps?:              string[];
  generated_at?:            string;
}

export interface ScenarioResult {
  gross_yield?:         number;
  net_yield?:           number;
  cap_rate?:            number;
  monthly_cashflow?:    number;
  annual_cashflow?:     number;
  cash_on_cash_return?: number;
  total_return_5yr?:    number;
  break_even_rent?:     number;
}

export interface SavedScenario {
  id:         string;
  name:       string;
  params:     ScenarioParams;
  result?:    ScenarioResult;
  created_at: string;
}

// ── Market models ───────────────────────────────────────────────────────────

export interface DatabaseStats {
  total_listings:    number;
  avg_price:         number;
  avg_price_per_sqm: number;
  avg_yield:         number;
  avg_days_listed:   number;
}

export interface MarketStats {
  avg_price:         number;
  avg_price_per_sqm: number;
  avg_yield:         number;
  total_listings:    number;
}

export interface ValueZone {
  area:            string;
  why_interesting: string;
}

export interface Neighbourhood {
  name:   string;
  reason: string;
}

export interface MarketData {
  city:                        string;
  database_stats:              DatabaseStats;
  market_temperature:          MarketTemperature;
  city_investment_rating:      number;
  temperature_reason:          string;
  buyer_seller_balance:        string;
  inventory_assessment:        string;
  price_level:                 string;
  price_trend:                 string;
  reasoning:                   string;
  value_zones:                 ValueZone[];
  yield_assessment:            string;
  vs_germany_average:          string;
  best_property_types:         string[];
  key_employers:               string[];
  population_trend:            string;
  infrastructure_developments: string[];
  outlook_1_year:              string;
  outlook_3_year:              string;
  key_risks:                   string[];
  key_opportunities:           string[];
  best_neighbourhoods:         Neighbourhood[];
  avoid_list:                  Neighbourhood[];
  negotiation_climate:         string;
  properties:                  Property[];
}

// ── Portfolio models ────────────────────────────────────────────────────────

export interface PortfolioEntry {
  id:                string;
  title?:            string;
  city?:             string;
  status:            PortfolioStatus;
  price?:            number;
  gross_yield?:      number;
  days_listed?:      number;
  valuation?:        number;
  compact_analysis?: CompactAnalysis;
}

export interface PortfolioAnalysisRanking {
  property_id: string;
  rank:        number;
  reasoning:   string;
  priority:    string;
}

export interface PortfolioAnalysis {
  report?:     string;
  created_at?: string;
  rankings?:   PortfolioAnalysisRanking[];
}

// ── Strategy models ─────────────────────────────────────────────────────────

export interface StrategyFinancingOption {
  type:            string;
  ltv:             number;
  down_payment:    number;
  monthly_payment: number;
  equity_required: number;
  recommended?:    boolean;
}

export interface StrategyTargetCity {
  name:         string;
  reason:       string;
  yield_range?: string;
}

export interface StrategyData {
  recommended_approach?: string;
  summary?:              string;
  target_yield?:         number;
  max_price?:            number;
  investment_timeline?:  string;
  target_cities?:        StrategyTargetCity[];
  key_criteria?:         string[];
  financing?:            StrategyFinancingOption[];
  matching_properties?:  Array<Pick<Property, 'id' | 'title' | 'city' | 'gross_yield' | 'compact_analysis'>>;
  matching_count?:       number;
  top_city?:             string;
}

// ── Negotiation models ──────────────────────────────────────────────────────

export interface NegotiateBrief {
  recommended_offer:  number;
  walk_away_price:    number;
  strategy:           string;
  leverage_points:    string[];
  talking_points_de:  string[];
  talking_points_en:  string[];
  offer_letter_draft: string;
}

// ── Chat models ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  created_at: string;
}

// ── Input types ─────────────────────────────────────────────────────────────

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
}

export interface UserProfileData {
  display_name?:     string;
  equity?:           number;
  monthly_income?:   number;
  monthly_expenses?: number;
  risk_style?:       string;
  hold_period?:      string;
  goal?:             string;
  cities?:           string[];
  property_types?:   string[];
}

// ── Core helpers ────────────────────────────────────────────────────────────

function buildHeaders(extra: HeadersInit = {}): Headers {
  const token   = getToken();
  const userId  = getUserId();
  const headers = new Headers(extra);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token)  headers.set('Authorization', `Bearer ${token}`);
  if (userId) headers.set('X-User-ID',     userId);
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
      headers: buildHeaders(options.headers),
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

  if (response.status === 204) {
    return { data: {} as T, error: null };
  }
  try {
    const text = await response.text();
    const data: T = text ? JSON.parse(text) : ({} as T);
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to parse server response.' };
  }
}

// Separate helper for endpoints that return a raw Response (streaming).
function rawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers),
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

// ── Auth ────────────────────────────────────────────────────────────────────

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

// ── Properties ──────────────────────────────────────────────────────────────

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
  return apiCall<Property[]>(`/api/properties${query}`);
}

export function fetchPropertyById(id: string) {
  return apiCall<PropertyDetail>(`/api/properties/${encodeURIComponent(id)}`);
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

// ── Portfolio ───────────────────────────────────────────────────────────────

export function saveToPortfolio(propertyId: string) {
  return apiCall<{ message: string }>(`/api/portfolio/watch/${encodeURIComponent(propertyId)}`, { method: 'POST' });
}

export function getPortfolio(status?: string) {
  const query = toParams({ status });
  return apiCall<PortfolioEntry[]>(`/api/portfolio${query}`);
}

export function updatePortfolioStatus(
  propertyId:     string,
  status:         string,
  notes?:         string,
  purchasePrice?: number,
) {
  return apiCall<{ message: string }>(`/api/portfolio/${encodeURIComponent(propertyId)}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, notes, purchase_price: purchasePrice }),
  });
}

export function removeFromPortfolio(propertyId: string) {
  return apiCall<{ message: string }>(`/api/portfolio/${encodeURIComponent(propertyId)}`, { method: 'DELETE' });
}

// ── Analysis ────────────────────────────────────────────────────────────────

export function getCompactAnalysis(propertyId: string) {
  return apiCall<CompactAnalysisData>(`/api/analysis/compact/${encodeURIComponent(propertyId)}`);
}

export function triggerDeepAnalysis(propertyId: string) {
  return apiCall<{ job_id: string }>(`/api/analysis/deep/${encodeURIComponent(propertyId)}`, {
    method: 'POST',
  });
}

export function getDeepAnalysis(propertyId: string) {
  return apiCall<DeepAnalysisData>(`/api/analysis/deep/${encodeURIComponent(propertyId)}`);
}

export function getMarketStats(city: string) {
  return apiCall<MarketStats>(`/api/analysis/market/${encodeURIComponent(city)}/stats`);
}

export function getMarketAnalysis(city: string, propertyType?: string) {
  const query = toParams({ property_type: propertyType });
  return apiCall<MarketData>(
    `/api/analysis/market/${encodeURIComponent(city)}${query}`,
  );
}

export function triggerPortfolioAnalysis() {
  return apiCall<{ job_id: string }>('/api/analysis/portfolio', { method: 'POST' });
}

export function getPortfolioAnalysis() {
  return apiCall<PortfolioAnalysis>('/api/analysis/portfolio');
}

export function runScenario(propertyId: string, params: ScenarioParams) {
  return apiCall<ScenarioResult>(`/api/analysis/scenario/${encodeURIComponent(propertyId)}`, {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

export function saveScenario(
  propertyId: string,
  name:       string,
  params:     ScenarioParams,
) {
  return apiCall<SavedScenario>(`/api/analysis/scenario/${encodeURIComponent(propertyId)}/save`, {
    method: 'POST',
    body:   JSON.stringify({ name, params }),
  });
}

export function getSavedScenarios(propertyId: string) {
  return apiCall<SavedScenario[]>(`/api/analysis/scenario/${encodeURIComponent(propertyId)}/saved`);
}

// ── Strategy ────────────────────────────────────────────────────────────────

export function generateStrategy() {
  return apiCall<StrategyData>('/api/strategy/generate', { method: 'POST' });
}

export function getStrategy() {
  return apiCall<StrategyData>('/api/strategy');
}

export function getStrategyMatches() {
  return apiCall<Property[]>('/api/strategy/matches');
}

// ── Negotiation ─────────────────────────────────────────────────────────────

export function generateNegotiationBrief(propertyId: string) {
  return apiCall<NegotiateBrief>(`/api/negotiation/${encodeURIComponent(propertyId)}`, { method: 'POST' });
}

export function getNegotiationBrief(propertyId: string) {
  return apiCall<NegotiateBrief>(`/api/negotiation/${encodeURIComponent(propertyId)}`);
}

// ── Profile ─────────────────────────────────────────────────────────────────

export function getUserProfile() {
  return apiCall<UserProfileData>('/api/users/profile');
}

export function saveUserProfile(data: UserProfileData) {
  return apiCall<UserProfileData>('/api/users/profile', {
    method: 'PUT',
    body:   JSON.stringify(data),
  });
}

// ── Chat ────────────────────────────────────────────────────────────────────

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
  return apiCall<ChatMessage[]>(`/api/chat/history${query}`);
}

export function clearChatHistory(contextType: string, contextId?: string) {
  const query = toParams({ context_type: contextType, context_id: contextId });
  return apiCall<{ message: string }>(`/api/chat/history${query}`, { method: 'DELETE' });
}

// ── Feedback ────────────────────────────────────────────────────────────────

export function submitFeedback(
  type:         string,
  content:      string,
  pageContext?: string,
  rating?:      number,
) {
  return apiCall<{ message: string }>('/api/feedback', {
    method: 'POST',
    body:   JSON.stringify({ type, content, page_context: pageContext, rating }),
  });
}

export function joinWaitlist(email: string, feature: string) {
  return apiCall<{ message: string }>('/api/waitlist', {
    method: 'POST',
    body:   JSON.stringify({ email, feature }),
  });
}
