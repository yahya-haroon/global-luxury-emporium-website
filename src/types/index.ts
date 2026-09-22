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
  link?: string;
  link_p?: string;
  link_r?: string;
  link_pr?: string;
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
}

export interface UserSession {
  email: string | null;
  id: string | null;
  isOwner: boolean;
}