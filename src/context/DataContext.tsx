import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, defaultSeedProducts, defaultSeedSettings } from '../lib/supabase';
import { normalizeProductOptions } from '../lib/options';
import { Product, Settings, Order, OrderStatus, Review, FeaturedImage, Sale } from '../types';
import { HomepageImage, fetchHomepageImages } from '../lib/homepageImages';
import {
  HomepageCategory,
  parseHomepageCategories,
  HP_CAT_PREFIX,
  DEFAULT_HOMEPAGE_CATEGORIES,
} from '../lib/homepageCategories';
import {
  CustomCategoryData,
  parseCustomCategories,
  STORE_CAT_PREFIX,
  slugifyCategory,
} from '../lib/storeCategories';
import { CATEGORIES } from '../lib/categories';
import { DEFAULT_THEME, applyThemeToDocument } from '../lib/theme';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  settings: Settings;
  orders: Order[];
  reviews: Review[];
  featuredImages: FeaturedImage[];
  homepageImages: HomepageImage[];
  homepageSlots: Record<string, HomepageImage>;
  homepageCategories: HomepageCategory[];
  customCategories: CustomCategoryData[];
  sales: Sale[];
  loading: boolean;
  error: string | null;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categories: string[];
  refreshData: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshReviews: () => Promise<void>;
  refreshFeaturedImages: () => Promise<void>;
  refreshHomepageImages: () => Promise<void>;
  refreshSales: () => Promise<void>;
  saveProduct: (productData: Partial<Product> & { id?: string }) => Promise<{ error?: string; product?: Product }>;
  deleteProduct: (id: string) => Promise<{ error?: string }>;
  toggleProductVisibility: (id: string, isVisible: boolean) => Promise<{ error?: string }>;
  saveSettings: (newSettings: Settings) => Promise<{ error?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ error?: string }>;
  createReview: (input: { product_id: string; customer_name: string; rating: number; review: string; published: boolean; verified?: boolean }) => Promise<{ error?: string }>;
  saveReviewEdits: (reviewId: string, edits: { rating?: number; review?: string; published?: boolean; product_id?: string; customer_name?: string; verified?: boolean }) => Promise<{ error?: string }>;
  deleteReview: (reviewId: string) => Promise<{ error?: string }>;
  addFeaturedImage: (image: { image_url: string; alt_text?: string }) => Promise<{ error?: string }>;
  updateFeaturedImage: (id: string, patch: Partial<Pick<FeaturedImage, 'alt_text' | 'is_active' | 'sort_order'>>) => Promise<{ error?: string }>;
  deleteFeaturedImage: (id: string) => Promise<{ error?: string }>;
  reorderFeaturedImages: (orderedIds: string[]) => Promise<{ error?: string }>;
  saveHomepageSlot: (
    slotKey: string,
    patch: Partial<Pick<HomepageImage, 'image_url' | 'storage_path' | 'alt_text' | 'title' | 'description' | 'product_id' | 'is_active' | 'sort_order' | 'media_type'>>
  ) => Promise<{ error?: string }>;
  deleteHomepageSlot: (slotKey: string) => Promise<{ error?: string }>;
  saveHomepageCategory: (categoryData: Partial<HomepageCategory> & { id?: string }) => Promise<{ error?: string; category?: HomepageCategory }>;
  deleteHomepageCategory: (id: string) => Promise<{ error?: string }>;
  reorderHomepageCategories: (orderedIds: string[]) => Promise<{ error?: string }>;
  initDefaultHomepageCategories: () => Promise<{ error?: string }>;
  saveCustomCategory: (categoryData: {
    id?: string;
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    is_active?: boolean;
    sort_order?: number;
    product_ids?: string[];
  }) => Promise<{ error?: string; category?: CustomCategoryData }>;
  deleteCustomCategory: (slug: string) => Promise<{ error?: string }>;
  assignProductsToCategory: (categorySlug: string, productIds: string[]) => Promise<{ error?: string }>;
  saveSale: (saleData: Partial<Sale>) => Promise<{ data?: Sale; error?: string }>;
  deleteSale: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleSaleActive: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSeedSettings);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [featuredImages, setFeaturedImages] = useState<FeaturedImage[]>([]);
  const [homepageImages, setHomepageImages] = useState<HomepageImage[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchSettings = useCallback(async (): Promise<Settings | null> => {
    if (!isSupabaseConfigured) {
      return defaultSeedSettings;
    }

    const { data, error: fetchErr } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching settings from Supabase:', fetchErr);
      throw new Error(`Failed to load store settings: ${fetchErr.message}`);
    }

    if (!data) {
      return defaultSeedSettings;
    }

    let parsedDeliveryZones = defaultSeedSettings.delivery_zones;
    if (Array.isArray(data.delivery_zones)) {
      parsedDeliveryZones = data.delivery_zones;
    } else if (typeof data.delivery_zones === 'string') {
      try {
        parsedDeliveryZones = JSON.parse(data.delivery_zones);
      } catch {
        parsedDeliveryZones = defaultSeedSettings.delivery_zones;
      }
    }

    const parsedTheme =
      data.theme && typeof data.theme === 'object'
        ? { ...DEFAULT_THEME, ...data.theme }
        : defaultSeedSettings.theme || DEFAULT_THEME;

    return {
      id: data.id,
      currency: data.currency || '£',
      whatsapp: data.whatsapp || '',
      contact_email: data.contact_email || '',
      address: data.address || '',
      company_number: data.company_number || '',
      instagram_url: data.instagram_url || '',
      facebook_url: data.facebook_url || '',
      personalisation: {
        enabled: data.personalisation_enabled ?? true,
        charge: data.personalisation_charge ?? false,
        price: Number(data.personalisation_price || 0),
        label: data.personalisation_label || 'Personalise your jacket',
        hint: data.personalisation_hint || 'Name or initials, up to 30 characters',
      },
      requirements: {
        enabled: data.requirements_enabled ?? true,
        charge: data.requirements_charge ?? false,
        price: Number(data.requirements_price || 0),
        label: data.requirements_label || 'Additional requirements',
        hint: data.requirements_hint || 'Anything else we should know (up to 110 characters)',
      },
      delivery_zones: parsedDeliveryZones,
      theme: parsedTheme,
      paypal_client_id: data.paypal_client_id || '',
      paypal_enabled: data.paypal_enabled ?? true,
    };
  }, []);

  const fetchProducts = useCallback(async (isOwner: boolean): Promise<Product[]> => {
    if (!isSupabaseConfigured) {
      return defaultSeedProducts;
    }

    let query = supabase.from('products').select('*');

    // If not owner, only show visible products
    if (!isOwner) {
      query = query.eq('is_visible', true);
    }

    // Sort by sort_order ascending, then created_at descending
    query = query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    const { data, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('Error fetching products from Supabase:', fetchErr);
      throw new Error(`Failed to load products: ${fetchErr.message}`);
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category || 'Women',
      description: p.description || '',
      sizes: p.sizes || 'XS, S, M, L, XL',

      // IMPORTANT: load dynamic product options from Supabase
      options: normalizeProductOptions(p.options),

      images:
        Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : ['/assets/products/shearling-aviator-jacket-main.png'],

      allow_personalisation: Boolean(p.allow_personalisation),
      allow_requirements: Boolean(p.allow_requirements),
      is_visible: p.is_visible ?? true,
      sort_order: Number(p.sort_order || 0),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }, []);

  const fetchOrders = useCallback(async (): Promise<Order[]> => {
    if (!isSupabaseConfigured || !user?.isOwner) {
      return [];
    }

    try {
      const { data, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersErr) {
        console.warn('Orders fetch notice (table may need creation):', ordersErr.message);
        return [];
      }

      return (data || []).map((o: any) => ({
        id: o.id,
        product_id: o.product_id,
        product_name: o.product_name,
        size: o.size,
        selected_options: o.selected_options || {},
        personalisation_text: o.personalisation_text || '',
        personalisation_fee: Number(o.personalisation_fee || 0),
        requirements_text: o.requirements_text || '',
        requirements_fee: Number(o.requirements_fee || 0),
        delivery_zone: o.delivery_zone || '',
        delivery_price: Number(o.delivery_price || 0),
        product_price: Number(o.product_price || 0),
        total_amount: Number(o.total_amount || 0),
        currency: o.currency || '£',
        customer_name: o.customer_name || '',
        email: o.email || '',
        address: typeof o.address === 'string' ? JSON.parse(o.address) : (o.address || { line1: '', city: '', postal_code: '', country: '' }),
        status: o.status || 'pending',
        stripe_payment_intent_id: o.stripe_payment_intent_id || '',
        created_at: o.created_at,
        updated_at: o.updated_at,
      }));
    } catch (err) {
      console.warn('Failed to load orders:', err);
      return [];
    }
  }, [user?.isOwner]);

  const refreshOrders = useCallback(async () => {
    if (user?.isOwner) {
      const loadedOrders = await fetchOrders();
      setOrders(loadedOrders);
    }
  }, [fetchOrders, user?.isOwner]);

  // ---- Reviews (public read published; owner-only read all for moderation) ----
  const fetchReviews = useCallback(async (): Promise<Review[]> => {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!user?.isOwner) {
        query = query.eq('published', true);
      }

      const { data, error: reviewsErr } = await query;

      if (reviewsErr) {
        console.warn('Reviews fetch notice (table may need migration):', reviewsErr.message);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        order_id: r.order_id,
        customer_name: r.customer_name || '',
        rating: Number(r.rating || 0),
        review: r.review || '',
        verified: Boolean(r.verified),
        published: r.published ?? true,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    } catch (err) {
      console.warn('Failed to load reviews:', err);
      return [];
    }
  }, [user?.isOwner]);

  const refreshReviews = useCallback(async () => {
    setReviews(await fetchReviews());
  }, [fetchReviews]);

  // ---- Sales (public read active; owner-only full read) ----
  const fetchSales = useCallback(async (): Promise<Sale[]> => {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (!user?.isOwner) {
        query = query.eq('is_active', true);
      }

      const { data, error: salesErr } = await query;

      if (salesErr) {
        console.warn('Sales fetch notice (table may need migration):', salesErr.message);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name || '',
        discount_percentage: Number(s.discount_percentage || 0),
        scope: s.scope || 'all',
        category: s.category || null,
        product_ids: Array.isArray(s.product_ids) ? s.product_ids : [],
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        is_active: Boolean(s.is_active ?? true),
        banner_text: s.banner_text || null,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));
    } catch (err) {
      console.warn('Failed to load sales:', err);
      return [];
    }
  }, [user?.isOwner]);

  const refreshSales = useCallback(async () => {
    setSales(await fetchSales());
  }, [fetchSales]);

  // ---- Admin: featured images ----
  const fetchFeaturedImages = useCallback(async (): Promise<FeaturedImage[]> => {
    if (!isSupabaseConfigured || !user?.isOwner) {
      return [];
    }

    try {
      const { data, error: featErr } = await supabase
        .from('featured_images')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (featErr) {
        console.warn('Featured images fetch notice (table may need migration):', featErr.message);
        return [];
      }

      return (data || []).map((f: any) => ({
        id: f.id,
        image_url: f.image_url,
        alt_text: f.alt_text || '',
        is_active: f.is_active ?? true,
        sort_order: Number(f.sort_order || 0),
        created_at: f.created_at,
        updated_at: f.updated_at,
      }));
    } catch (err) {
      console.warn('Failed to load featured images:', err);
      return [];
    }
  }, [user?.isOwner]);

  const refreshFeaturedImages = useCallback(async () => {
    if (user?.isOwner) {
      setFeaturedImages(await fetchFeaturedImages());
    }
  }, [fetchFeaturedImages, user?.isOwner]);

  // ---- Homepage image configuration (public read; RLS limits anon to active rows) ----
  const refreshHomepageImages = useCallback(async () => {
    setHomepageImages(await fetchHomepageImages());
  }, []);

  const saveHomepageSlot = useCallback(
    async (
      slotKey: string,
      patch: Partial<
        Pick<
          HomepageImage,
          'image_url' | 'storage_path' | 'alt_text' | 'title' | 'description' | 'product_id' | 'is_active' | 'sort_order' | 'media_type'
        >
      >
    ): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can change homepage images.' };

      try {
        const { error: upsertErr } = await supabase
          .from('homepage_images')
          .upsert(
            {
              slot_key: slotKey,
              ...patch,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'slot_key' }
          );

        if (upsertErr) throw upsertErr;

        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error saving homepage slot:', err);
        return { error: err.message || 'Failed to save homepage image slot.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  const deleteHomepageSlot = useCallback(
    async (slotKey: string): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can manage homepage items.' };

      try {
        const { error: delErr } = await supabase
          .from('homepage_images')
          .delete()
          .eq('slot_key', slotKey);

        if (delErr) throw delErr;
        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error deleting homepage slot:', err);
        return { error: err.message || 'Failed to delete homepage item.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  const saveHomepageCategory = useCallback(
    async (
      categoryData: Partial<HomepageCategory> & { id?: string }
    ): Promise<{ error?: string; category?: HomepageCategory }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can manage categories.' };

      try {
        const catId = (categoryData.id || `cat_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const slotKey = `${HP_CAT_PREFIX}${catId}`;

        const payload = {
          slot_key: slotKey,
          title: categoryData.name?.trim() || 'Category',
          description: categoryData.destination_category || 'all',
          image_url: categoryData.image_url ?? null,
          storage_path: categoryData.storage_path ?? null,
          alt_text: categoryData.alt_text?.trim() || categoryData.name?.trim() || '',
          sort_order: typeof categoryData.display_order === 'number' ? categoryData.display_order : 0,
          is_active: categoryData.is_active ?? true,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from('homepage_images')
          .upsert(payload, { onConflict: 'slot_key' });

        if (upsertErr) throw upsertErr;

        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error saving homepage category:', err);
        return { error: err.message || 'Failed to save homepage category.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  const deleteHomepageCategory = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      return deleteHomepageSlot(`${HP_CAT_PREFIX}${id}`);
    },
    [deleteHomepageSlot]
  );

  const reorderHomepageCategories = useCallback(
    async (orderedIds: string[]): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can manage categories.' };

      try {
        for (let i = 0; i < orderedIds.length; i++) {
          const slotKey = `${HP_CAT_PREFIX}${orderedIds[i]}`;
          await supabase
            .from('homepage_images')
            .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
            .eq('slot_key', slotKey);
        }
        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error reordering homepage categories:', err);
        return { error: err.message || 'Failed to reorder categories.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  const initDefaultHomepageCategories = useCallback(
    async (): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can manage categories.' };

      try {
        for (const cat of DEFAULT_HOMEPAGE_CATEGORIES) {
          const slotKey = `${HP_CAT_PREFIX}${cat.id}`;
          await supabase.from('homepage_images').upsert(
            {
              slot_key: slotKey,
              title: cat.name,
              description: cat.destination_category,
              image_url: cat.image_url,
              storage_path: null,
              alt_text: cat.alt_text,
              sort_order: cat.display_order,
              is_active: cat.is_active,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'slot_key' }
          );
        }
        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error seeding default categories:', err);
        return { error: err.message || 'Failed to initialize default categories.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  // ---- Mutation: Custom store categories and product assignment ----
  const saveCustomCategory = useCallback(
    async (catData: {
      id?: string;
      name: string;
      slug?: string;
      description?: string;
      image_url?: string;
      is_active?: boolean;
      sort_order?: number;
      product_ids?: string[];
    }): Promise<{ error?: string; category?: CustomCategoryData }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can manage categories.' };

      try {
        const rawSlug = catData.slug?.trim() || slugifyCategory(catData.name);
        const slug = slugifyCategory(rawSlug);
        if (!slug) {
          return { error: 'Category slug is invalid or empty.' };
        }

        const slotKey = `${STORE_CAT_PREFIX}${slug}`;
        const existing = homepageImages.find((r) => r.slot_key === slotKey);

        let currentMeta: { product_ids?: string[] } = {};
        if (existing?.alt_text) {
          try {
            currentMeta = JSON.parse(existing.alt_text);
          } catch {
            currentMeta = {};
          }
        }

        const metaObj = {
          slug,
          is_custom: true,
          product_ids: catData.product_ids ?? currentMeta.product_ids ?? [],
        };

        const payload = {
          slot_key: slotKey,
          title: catData.name.trim(),
          description: catData.description?.trim() || '',
          image_url: catData.image_url ?? existing?.image_url ?? null,
          storage_path: existing?.storage_path ?? null,
          alt_text: JSON.stringify(metaObj),
          sort_order: Number(catData.sort_order ?? existing?.sort_order ?? 10),
          is_active: catData.is_active ?? existing?.is_active ?? true,
          updated_at: new Date().toISOString(),
        };

        const { data, error: upsertErr } = await supabase
          .from('homepage_images')
          .upsert(payload, { onConflict: 'slot_key' })
          .select()
          .single();

        if (upsertErr) throw upsertErr;

        await refreshHomepageImages();

        return {
          category: {
            id: data.id || `custom_${slug}`,
            slug,
            name: data.title,
            description: data.description,
            image_url: data.image_url,
            storage_path: data.storage_path,
            is_custom: true,
            sort_order: data.sort_order,
            product_ids: metaObj.product_ids,
            is_active: data.is_active,
          },
        };
      } catch (err: any) {
        console.error('Error saving custom category:', err);
        return { error: err.message || 'Failed to save custom category.' };
      }
    },
    [homepageImages, refreshHomepageImages, user?.isOwner]
  );

  const deleteCustomCategory = useCallback(
    async (slug: string): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can delete categories.' };

      try {
        const normSlug = slugifyCategory(slug);
        const slotKey = `${STORE_CAT_PREFIX}${normSlug}`;
        const { error: delErr } = await supabase
          .from('homepage_images')
          .delete()
          .eq('slot_key', slotKey);

        if (delErr) throw delErr;

        await refreshHomepageImages();
        return {};
      } catch (err: any) {
        console.error('Error deleting custom category:', err);
        return { error: err.message || 'Failed to delete category.' };
      }
    },
    [refreshHomepageImages, user?.isOwner]
  );

  // ---- Mutation: order delivery status ----
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can update orders.' };

      try {
        const { error: updErr } = await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        if (updErr) throw updErr;

        await refreshOrders();
        return {};
      } catch (err: any) {
        console.error('Error updating order status:', err);
        return { error: err.message || 'Failed to update order status.' };
      }
    },
    [refreshOrders, user?.isOwner]
  );

  // ---- Mutation: admin creates a review manually ----
  const createReview = useCallback(
    async (input: {
      product_id: string;
      customer_name: string;
      rating: number;
      review: string;
      published: boolean;
      verified?: boolean;
    }): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can add reviews.' };

      try {
        const { error: insErr } = await supabase
          .from('reviews')
          .insert([{
            product_id: input.product_id,
            customer_name: input.customer_name || '',
            rating: input.rating,
            review: input.review,
            published: input.published,
            verified: input.verified ?? false,
          }]);

        if (insErr) throw insErr;

        await refreshReviews();
        return {};
      } catch (err: any) {
        console.error('Error creating review:', err);
        return { error: err.message || 'Failed to create review.' };
      }
    },
    [refreshReviews, user?.isOwner]
  );

  // ---- Mutation: review moderation (edit text/rating/product/name, verified, publish/unpublish) ----
  const saveReviewEdits = useCallback(
    async (
      reviewId: string,
      edits: { rating?: number; review?: string; published?: boolean; product_id?: string; customer_name?: string; verified?: boolean }
    ): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can moderate reviews.' };

      try {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (edits.rating !== undefined) payload.rating = edits.rating;
        if (edits.review !== undefined) payload.review = edits.review;
        if (edits.published !== undefined) payload.published = edits.published;
        if (edits.product_id !== undefined) payload.product_id = edits.product_id;
        if (edits.customer_name !== undefined) payload.customer_name = edits.customer_name;
        if (edits.verified !== undefined) payload.verified = edits.verified;

        const { error: updErr } = await supabase
          .from('reviews')
          .update(payload)
          .eq('id', reviewId);

        if (updErr) throw updErr;

        await refreshReviews();
        return {};
      } catch (err: any) {
        console.error('Error moderating review:', err);
        return { error: err.message || 'Failed to moderate review.' };
      }
    },
    [refreshReviews, user?.isOwner]
  );

  const deleteReview = useCallback(
    async (reviewId: string): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can delete reviews.' };

      try {
        const { error: delErr } = await supabase
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (delErr) throw delErr;

        await refreshReviews();
        return {};
      } catch (err: any) {
        console.error('Error deleting review:', err);
        return { error: err.message || 'Failed to delete review.' };
      }
    },
    [refreshReviews, user?.isOwner]
  );

  // ---- Mutations: featured images ----
  const addFeaturedImage = useCallback(
    async (image: { image_url: string; alt_text?: string }): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized.' };

      try {
        const nextSort = featuredImages.length
          ? Math.max(...featuredImages.map((f) => f.sort_order)) + 1
          : 0;

        const { error: insErr } = await supabase
          .from('featured_images')
          .insert([{
            image_url: image.image_url,
            alt_text: image.alt_text || '',
            is_active: true,
            sort_order: nextSort,
          }]);

        if (insErr) throw insErr;

        await refreshFeaturedImages();
        return {};
      } catch (err: any) {
        console.error('Error adding featured image:', err);
        return { error: err.message || 'Failed to add featured image.' };
      }
    },
    [featuredImages, refreshFeaturedImages, user?.isOwner]
  );

  const updateFeaturedImage = useCallback(
    async (
      id: string,
      patch: Partial<Pick<FeaturedImage, 'alt_text' | 'is_active' | 'sort_order'>>
    ): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized.' };

      try {
        const { error: updErr } = await supabase
          .from('featured_images')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updErr) throw updErr;

        await refreshFeaturedImages();
        return {};
      } catch (err: any) {
        console.error('Error updating featured image:', err);
        return { error: err.message || 'Failed to update featured image.' };
      }
    },
    [refreshFeaturedImages, user?.isOwner]
  );

  const deleteFeaturedImage = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized.' };

      try {
        const { error: delErr } = await supabase
          .from('featured_images')
          .delete()
          .eq('id', id);

        if (delErr) throw delErr;

        await refreshFeaturedImages();
        return {};
      } catch (err: any) {
        console.error('Error deleting featured image:', err);
        return { error: err.message || 'Failed to delete featured image.' };
      }
    },
    [refreshFeaturedImages, user?.isOwner]
  );

  const reorderFeaturedImages = useCallback(
    async (orderedIds: string[]): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized.' };

      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            supabase
              .from('featured_images')
              .update({ sort_order: index, updated_at: new Date().toISOString() })
              .eq('id', id)
          )
        );

        await refreshFeaturedImages();
        return {};
      } catch (err: any) {
        console.error('Error reordering featured images:', err);
        return { error: err.message || 'Failed to reorder featured images.' };
      }
    },
    [refreshFeaturedImages, user?.isOwner]
  );

  // ---- Mutations: Sales ----
  const saveSale = useCallback(
    async (saleData: Partial<Sale>): Promise<{ data?: Sale; error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only store owners can manage sales.' };

      try {
        const payload: any = {
          name: saleData.name?.trim(),
          discount_percentage: Number(saleData.discount_percentage),
          scope: saleData.scope || 'all',
          category: saleData.scope === 'category' ? (saleData.category?.trim() || null) : null,
          product_ids: saleData.scope === 'products' ? (saleData.product_ids || []) : [],
          starts_at: saleData.starts_at,
          ends_at: saleData.ends_at,
          is_active: saleData.is_active ?? true,
          banner_text: saleData.banner_text?.trim() || null,
          updated_at: new Date().toISOString(),
        };

        let resultData: any = null;

        if (saleData.id) {
          const { data, error: updErr } = await supabase
            .from('sales')
            .update(payload)
            .eq('id', saleData.id)
            .select()
            .single();

          if (updErr) throw updErr;
          resultData = data;
        } else {
          const { data, error: insErr } = await supabase
            .from('sales')
            .insert([{ ...payload, created_at: new Date().toISOString() }])
            .select()
            .single();

          if (insErr) throw insErr;
          resultData = data;
        }

        await refreshSales();
        return { data: resultData as Sale };
      } catch (err: any) {
        console.error('Error saving sale:', err);
        return { error: err.message || 'Failed to save sale.' };
      }
    },
    [refreshSales, user?.isOwner]
  );

  const deleteSale = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured) return { success: false, error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { success: false, error: 'Unauthorized.' };

      try {
        const { error: delErr } = await supabase
          .from('sales')
          .delete()
          .eq('id', id);

        if (delErr) throw delErr;

        await refreshSales();
        return { success: true };
      } catch (err: any) {
        console.error('Error deleting sale:', err);
        return { success: false, error: err.message || 'Failed to delete sale.' };
      }
    },
    [refreshSales, user?.isOwner]
  );

  const toggleSaleActive = useCallback(
    async (id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured) return { success: false, error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { success: false, error: 'Unauthorized.' };

      try {
        const { error: updErr } = await supabase
          .from('sales')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updErr) throw updErr;

        await refreshSales();
        return { success: true };
      } catch (err: any) {
        console.error('Error toggling sale active status:', err);
        return { success: false, error: err.message || 'Failed to update sale.' };
      }
    },
    [refreshSales, user?.isOwner]
  );

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        // Run with default seed data
        setSettings(defaultSeedSettings);
        setProducts(defaultSeedProducts);
        setOrders([]);
        setReviews([]);
        setFeaturedImages([]);
        setHomepageImages([]);
        setSales([]);
      } else {
        // Fetch real Supabase data
        const [loadedSettings, loadedProducts, loadedOrders, loadedReviews, loadedFeatured, loadedHomepage, loadedSales] = await Promise.all([
          fetchSettings(),
          fetchProducts(Boolean(user?.isOwner)),
          fetchOrders(),
          fetchReviews(),
          fetchFeaturedImages(),
          fetchHomepageImages(),
          fetchSales(),
        ]);

        if (loadedSettings) {
          setSettings(loadedSettings);
        }

        setProducts(loadedProducts);
        setOrders(loadedOrders);
        setReviews(loadedReviews);
        setFeaturedImages(loadedFeatured);
        setHomepageImages(loadedHomepage);
        setSales(loadedSales);
      }
    } catch (err: any) {
      console.error('Data loading error:', err);
      setError(err.message || 'An error occurred while loading store data.');
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, fetchProducts, fetchOrders, fetchReviews, fetchFeaturedImages, fetchHomepageImages, fetchSales, user?.isOwner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Dynamically apply active color theme whenever settings are loaded or updated
  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  // ---- Mutation: assign products to category ----
  const assignProductsToCategory = useCallback(
    async (categorySlug: string, productIds: string[]): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
      if (!user?.isOwner) return { error: 'Unauthorized. Only the owner can assign products to categories.' };

      try {
        const normSlug = slugifyCategory(categorySlug);
        const slotKey = `${STORE_CAT_PREFIX}${normSlug}`;
        const existing = homepageImages.find((r) => r.slot_key === slotKey);

        let currentName = existing?.title || normSlug;
        let isCustom = true;
        let currentDesc = existing?.description || '';

        // Check if it's a built-in category
        const builtInDef = CATEGORIES[normSlug as any];
        if (builtInDef) {
          currentName = builtInDef.name;
          isCustom = false;
          currentDesc = builtInDef.subheadline;
        }

        const metaObj = {
          slug: normSlug,
          is_custom: isCustom,
          product_ids: productIds,
        };

        const payload = {
          slot_key: slotKey,
          title: currentName,
          description: currentDesc,
          image_url: existing?.image_url ?? null,
          storage_path: existing?.storage_path ?? null,
          alt_text: JSON.stringify(metaObj),
          sort_order: existing?.sort_order ?? 10,
          is_active: existing?.is_active ?? true,
          updated_at: new Date().toISOString(),
        };

        const { error: slotErr } = await supabase
          .from('homepage_images')
          .upsert(payload, { onConflict: 'slot_key' });

        if (slotErr) throw slotErr;

        // Also update product.category for all assigned products in Supabase
        if (productIds.length > 0) {
          const { error: prodErr } = await supabase
            .from('products')
            .update({ category: normSlug, updated_at: new Date().toISOString() })
            .in('id', productIds);

          if (prodErr) {
            console.warn('Notice: bulk product category update returned:', prodErr.message);
          }
        }

        await refreshHomepageImages();
        await refreshData();
        return {};
      } catch (err: any) {
        console.error('Error assigning products to category:', err);
        return { error: err.message || 'Failed to assign products to category.' };
      }
    },
    [homepageImages, refreshHomepageImages, refreshData, user?.isOwner]
  );

  // Dynamic custom store categories from Supabase
  const customCategories: CustomCategoryData[] = useMemo(() => {
    return parseCustomCategories(homepageImages);
  }, [homepageImages]);

  // Derive categories list from current products + custom categories
  const categories = useMemo(() => {
    const fromProducts = products.map((p) => p.category?.trim()).filter(Boolean);
    const fromCustom = customCategories.map((c) => c.name);
    return ['All', ...Array.from(new Set([...fromProducts, ...fromCustom]))];
  }, [products, customCategories]);

  // Active homepage image configuration keyed by slot (storefront consumers
  // filter here so an owner browsing while signed in never sees draft rows).
  const homepageSlots: Record<string, HomepageImage> = useMemo(() => {
    const slots: Record<string, HomepageImage> = {};
    for (const row of homepageImages) {
      if (row.is_active) {
        slots[row.slot_key] = row;
      }
    }
    return slots;
  }, [homepageImages]);

  // Dynamic admin-controlled homepage categories
  const homepageCategories: HomepageCategory[] = useMemo(() => {
    return parseHomepageCategories(homepageImages);
  }, [homepageImages]);

  // Save or edit product
  const saveProduct = async (
    productData: Partial<Product> & { id?: string }
  ): Promise<{ error?: string; product?: Product }> => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase is not configured. Changes cannot be saved to the database.',
      };
    }

    if (!user?.isOwner) {
      return {
        error: 'Unauthorized. Only the owner can manage products.',
      };
    }

    try {
      const dbPayload = {
        name: productData.name?.trim(),
        price: Number(productData.price),
        category: productData.category?.trim() || 'Women',
        description: productData.description?.trim() || '',
        sizes: productData.sizes?.trim() || 'XS, S, M, L, XL',

        // IMPORTANT: save dynamic product options to Supabase
        options: normalizeProductOptions(productData.options),

        images: productData.images || [],
        allow_personalisation: Boolean(
          productData.allow_personalisation
        ),
        allow_requirements: Boolean(
          productData.allow_requirements
        ),
        is_visible: productData.is_visible ?? true,
        sort_order: Number(
          productData.sort_order ?? products.length + 1
        ),
        updated_at: new Date().toISOString(),
      };

      if (productData.id) {
        // Update existing product
        const { data, error: updateErr } = await supabase
          .from('products')
          .update(dbPayload)
          .eq('id', productData.id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        await refreshData();
        return { product: data };
      } else {
        // Insert new product
        const { data, error: insertErr } = await supabase
          .from('products')
          .insert([dbPayload])
          .select()
          .single();

        if (insertErr) throw insertErr;

        await refreshData();
        return { product: data };
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      return {
        error: err.message || 'Failed to save product',
      };
    }
  };

  // Delete product
  const deleteProduct = async (
    id: string
  ): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase is not configured. Changes cannot be saved to the database.',
      };
    }

    if (!user?.isOwner) {
      return {
        error: 'Unauthorized. Only the owner can delete products.',
      };
    }

    try {
      const { error: delErr } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      await refreshData();
      return {};
    } catch (err: any) {
      console.error('Error deleting product:', err);
      return {
        error: err.message || 'Failed to delete product',
      };
    }
  };

  // Toggle product visibility
  const toggleProductVisibility = async (
    id: string,
    isVisible: boolean
  ): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured.' };
    }

    if (!user?.isOwner) {
      return { error: 'Unauthorized.' };
    }

    try {
      const { error: updErr } = await supabase
        .from('products')
        .update({
          is_visible: isVisible,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updErr) throw updErr;

      await refreshData();
      return {};
    } catch (err: any) {
      console.error('Error toggling product visibility:', err);
      return {
        error: err.message || 'Failed to update visibility',
      };
    }
  };

  // Save store settings
  const saveSettings = async (
    newSettings: Settings
  ): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase is not configured. Settings cannot be saved to the database.',
      };
    }

    if (!user?.isOwner) {
      return {
        error:
          'Unauthorized. Only the owner can change settings.',
      };
    }

    try {
      const dbPayload = {
        currency: newSettings.currency || '£',
        whatsapp: newSettings.whatsapp || '',
        contact_email: newSettings.contact_email || '',
        address: newSettings.address || '',
        company_number: newSettings.company_number || '',
        instagram_url: newSettings.instagram_url || '',
        facebook_url: newSettings.facebook_url || '',

        personalisation_enabled: Boolean(
          newSettings.personalisation.enabled
        ),
        personalisation_charge: Boolean(
          newSettings.personalisation.charge
        ),
        personalisation_price: Number(
          newSettings.personalisation.price || 0
        ),
        personalisation_label:
          newSettings.personalisation.label || '',
        personalisation_hint:
          newSettings.personalisation.hint || '',

        requirements_enabled: Boolean(
          newSettings.requirements.enabled
        ),
        requirements_charge: Boolean(
          newSettings.requirements.charge
        ),
        requirements_price: Number(
          newSettings.requirements.price || 0
        ),
        requirements_label:
          newSettings.requirements.label || '',
        requirements_hint:
          newSettings.requirements.hint || '',

        delivery_zones: newSettings.delivery_zones || defaultSeedSettings.delivery_zones,
        theme: newSettings.theme || DEFAULT_THEME,
        paypal_client_id: newSettings.paypal_client_id ?? '',
        paypal_enabled: Boolean(newSettings.paypal_enabled ?? true),

        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('settings')
        .upsert({
          id: 'default',
          ...dbPayload,
        });

      if (upsertErr) throw upsertErr;

      setSettings(newSettings);
      applyThemeToDocument(newSettings.theme);
      return {};
    } catch (err: any) {
      console.error('Error updating settings:', err);
      return {
        error: err.message || 'Failed to update settings',
      };
    }
  };

  return (
    <DataContext.Provider
      value={{
        products,
        settings,
        orders,
        reviews,
        featuredImages,
        homepageImages,
        homepageSlots,
        homepageCategories,
        customCategories,
        sales,
        loading,
        error,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        categories,
        refreshData,
        refreshOrders,
        refreshReviews,
        refreshFeaturedImages,
        refreshHomepageImages,
        refreshSales,
        saveProduct,
        deleteProduct,
        toggleProductVisibility,
        saveSettings,
        updateOrderStatus,
        createReview,
        saveReviewEdits,
        deleteReview,
        addFeaturedImage,
        updateFeaturedImage,
        deleteFeaturedImage,
        reorderFeaturedImages,
        saveHomepageSlot,
        deleteHomepageSlot,
        saveHomepageCategory,
        deleteHomepageCategory,
        reorderHomepageCategories,
        initDefaultHomepageCategories,
        saveCustomCategory,
        deleteCustomCategory,
        assignProductsToCategory,
        saveSale,
        deleteSale,
        toggleSaleActive,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }

  return context;
};