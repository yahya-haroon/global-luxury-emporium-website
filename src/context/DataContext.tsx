import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, defaultSeedProducts, defaultSeedSettings } from '../lib/supabase';
import { normalizeProductOptions } from '../lib/options';
import { Product, Settings, Order } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  settings: Settings;
  orders: Order[];
  loading: boolean;
  error: string | null;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  categories: string[];
  refreshData: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  saveProduct: (productData: Partial<Product> & { id?: string }) => Promise<{ error?: string; product?: Product }>;
  deleteProduct: (id: string) => Promise<{ error?: string }>;
  toggleProductVisibility: (id: string, isVisible: boolean) => Promise<{ error?: string }>;
  saveSettings: (newSettings: Settings) => Promise<{ error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSeedSettings);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

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

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        // Run with default seed data
        setSettings(defaultSeedSettings);
        setProducts(defaultSeedProducts);
        setOrders([]);
      } else {
        // Fetch real Supabase data
        const [loadedSettings, loadedProducts, loadedOrders] = await Promise.all([
          fetchSettings(),
          fetchProducts(Boolean(user?.isOwner)),
          fetchOrders(),
        ]);

        if (loadedSettings) {
          setSettings(loadedSettings);
        }

        setProducts(loadedProducts);
        setOrders(loadedOrders);
      }
    } catch (err: any) {
      console.error('Data loading error:', err);
      setError(err.message || 'An error occurred while loading store data.');
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, fetchProducts, fetchOrders, user?.isOwner]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Derive categories list from current products
  const categories = [
    'All',
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

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
        loading,
        error,
        activeCategory,
        setActiveCategory,
        categories,
        refreshData,
        refreshOrders,
        saveProduct,
        deleteProduct,
        toggleProductVisibility,
        saveSettings,
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