export interface MetaUserData {
  em?: string; // Email
  ph?: string; // Phone
  fn?: string; // First name
  ln?: string; // Last name
  ct?: string; // City
  st?: string; // State
  zp?: string; // Zip code
  country?: string; // Country
  [key: string]: string | undefined;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_type?: string;
  content_id?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  [key: string]: string | number | undefined;
}

export interface MetaConversionEventData {
  event_id: string;
  event_name: string;
  event_time: number;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  event_source_url?: string;
  action_source?: string;
}

export interface MetaWebhookPayload {
  data: MetaConversionEventData[];
}

export interface NormalizedUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface ProcessConversionResult {
  success: boolean;
  eventId?: string;
  processed: number;
  errors?: Array<{
    eventId: string;
    error: string;
  }>;
}

export interface ConversionEventStore {
  eventId: string;
  eventName: string;
  eventTime: Date;
  userData: NormalizedUserData;
  customData?: MetaCustomData;
  pixelId: string;
  status: 'pending' | 'processed' | 'failed';
}
