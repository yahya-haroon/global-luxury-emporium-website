import { createClient } from '@supabase/supabase-js';
import { Product, Settings } from '../types';

export const OWNER_EMAIL = 'yahyaharoon77@gmail.com';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-api-key')
);

// Create Supabase client using ONLY the anon public key
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Default seed settings matching specifications
export const defaultSeedSettings: Settings = {
  id: 'default',
  currency: '£',
  whatsapp: '+923278434142',
  contact_email: 'globalluxuryemporium@gmail.com',
  address: 'London, United Kingdom',
  company_number: '',
  instagram_url: 'https://www.instagram.com/global_luxury_emporium',
  facebook_url: 'https://www.facebook.com/share/19Kwj7GJHw/',
  personalisation: {
    enabled: true,
    charge: false,
    price: 0,
    label: 'Personalise your jacket',
    hint: 'Name or initials, up to 30 characters',
  },
  requirements: {
    enabled: true,
    charge: false,
    price: 0,
    label: 'Additional requirements',
    hint: 'Anything else we should know (up to 110 characters)',
  },
  delivery_zones: [
    { id: 'uk', name: 'United Kingdom', price: 0 },
    { id: 'row', name: 'Rest of world', price: 35 },
  ],
};

// Default seed products matching specifications
export const defaultSeedProducts: Product[] = [
  {
    id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
    name: 'Shearling Aviator Jacket',
    price: 349,
    category: 'Women',
    description: 'Handcrafted from supple calfskin leather with a plush shearling collar and wool lining. Designed in London, cut and finished in our dedicated factory in Pakistan for lifetime durability.',
    sizes: 'XS, S, M, L, XL',
    options: [
      {
        name: 'Color',
        type: 'color',
        required: true,
        values: ['Black', 'Brown', 'Burgundy'],
      },
    ],
    images: [
      '/assets/products/shearling-aviator-jacket-main.png',
      '/assets/products/shearling-aviator-jacket-hover.png',
    ],
    allow_personalisation: true,
    allow_requirements: true,
    is_visible: true,
    sort_order: 1,
  },
  {
    id: 'a1b2c3d4-e5f6-4a1b-8c2d-222222222222',
    name: 'Quilted Burgundy Biker Jacket',
    price: 299,
    category: 'Women',
    description: 'Premium full-grain burgundy leather with distinctive diamond-quilted shoulders, asymmetrical antique brass zip, and contoured ergonomic fit. An iconic British silhouette crafted to perfection.',
    sizes: 'XS, S, M, L, XL',
    options: [
      {
        name: 'Color',
        type: 'color',
        required: true,
        values: ['Burgundy', 'Black', 'Vintage Brown'],
      },
    ],
    images: [
      '/assets/products/quilted-burgundy-biker-jacket-main.png',
      '/assets/products/quilted-burgundy-biker-jacket-hover.png',
    ],
    allow_personalisation: true,
    allow_requirements: true,
    is_visible: true,
    sort_order: 2,
  },
  {
    id: 'a1b2c3d4-e5f6-4a1b-8c2d-333333333333',
    name: 'Classic Black Racer Jacket',
    price: 319,
    category: 'Men',
    description: 'Minimalist café racer styling engineered from heavyweight black steerhide. Features a clean band collar, storm flap, and reinforced stitching for the modern gentleman with global ambition.',
    sizes: 'S, M, L, XL, XXL',
    options: [
      {
        name: 'Color',
        type: 'color',
        required: true,
        values: ['Black', 'Dark Brown', 'Tan'],
      },
    ],
    images: [
      '/assets/products/classic-black-racer-jacket-main.png',
      '/assets/products/classic-black-racer-jacket-hover.png',
    ],
    allow_personalisation: true,
    allow_requirements: true,
    is_visible: true,
    sort_order: 3,
  },
];

/**
 * Upload an image Blob to the 'product-images' Supabase storage bucket.
 * Returns the public URL of the uploaded image.
 */
export async function uploadProductImage(fileBlob: Blob, fileName: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `uploads/${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, fileBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileBlob.type || 'image/webp',
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}
