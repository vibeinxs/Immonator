import { type Verdict } from '../common/VerdictBadge';

export type MarketTemperature = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

export interface CompactAnalysis {
  verdict?:          Verdict;
  one_line_summary?: string;
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
  compact_analysis?: CompactAnalysis;
}
