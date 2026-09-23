export type ProductOptionType =
  | 'select'
  | 'radio'
  | 'color'
  | 'text'
  | 'textarea';

export interface ProductOption {
  name: string;
  type: ProductOptionType;
  required: boolean;
  values: string[];
  label?: string;
  placeholder?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  sizes: string;
  options: ProductOption[];
  images: string[];
  allow_personalisation: boolean;
  allow_requirements: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PersonalisationSettings {
  enabled: boolean;
  charge: boolean;
  price: number;
  label: string;
  hint: string;
}

export interface RequirementsSettings {
  enabled: boolean;
  charge: boolean;
  price: number;
  label: string;
  hint: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
}

export interface Settings {
  id: string;
  currency: string;
  whatsapp: string;
  contact_email: string;
  address: string;
  company_number: string;
  instagram_url: string;
  facebook_url: string;
  personalisation: PersonalisationSettings;
  requirements: RequirementsSettings;
  delivery_zones: DeliveryZone[];
}

export interface OrderAddress {
  line1: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  size: string;
  selected_options?: Record<string, string>;
  personalisation_text: string;
  personalisation_fee: number;
  requirements_text: string;
  requirements_fee: number;
  delivery_zone: string;
  delivery_price: number;
  product_price: number;
  total_amount: number;
  currency: string;
  customer_name: string;
  email: string;
  address: OrderAddress;
  status: 'pending' | 'paid' | 'failed';
  stripe_payment_intent_id: string;
  created_at: string;
  updated_at?: string;
}

export interface UserSession {
  email: string | null;
  id: string | null;
  isOwner: boolean;
}