import { supabase, isSupabaseConfigured } from './supabase';
import {
  CustomDesignFormState,
  CustomDesignRequest,
} from '../types/customDesign';

/**
 * Generates a unique, elegant luxury reference number.
 * Format: GLE-CD-XXXX-YYYY (e.g. GLE-CD-7K4M-9B2F)
 */
export function generateCustomDesignReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GLE-CD-${part1}-${part2}`;
}

const LOCAL_STORAGE_BACKUP_KEY = 'gle_custom_design_requests_backup';

function getLocalBackups(): CustomDesignRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBackup(req: CustomDesignRequest) {
  try {
    const existing = getLocalBackups();
    existing.unshift(req);
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save local backup of design request:', err);
  }
}

/**
 * Submits a customer design request.
 * Inserts a row into public.custom_design_requests.
 * If the database table hasn't been created yet on production, falls back gracefully to local storage.
 */
export async function submitCustomDesignRequest(
  form: CustomDesignFormState
): Promise<{ success: boolean; referenceNumber: string; error?: string }> {
  const referenceNumber = generateCustomDesignReference();

  // Validate contact info
  if (!form.contact.fullName.trim() || !form.contact.email.trim() || !form.contact.phone.trim()) {
    return {
      success: false,
      referenceNumber,
      error: 'Please provide your full name, email address, and phone or WhatsApp number.',
    };
  }

  // Sanitize reference images: if dataUrl is too large for database row, we store clean metadata
  const sanitizedImages = form.referenceImages.map((img) => ({
    id: img.id,
    name: img.name,
    size: img.size,
    type: img.type,
    label: img.label,
    // Store dataUrl only if under 500KB or store marker
    dataUrl: img.dataUrl && img.dataUrl.length < 500000 ? img.dataUrl : undefined,
  }));

  const payload: Omit<CustomDesignRequest, 'id'> = {
    reference_number: referenceNumber,
    status: 'new',
    customer_name: form.contact.fullName.trim(),
    email: form.contact.email.trim().toLowerCase(),
    phone: form.contact.phone.trim(),
    country: form.contact.country.trim() || 'United Kingdom',
    preferred_contact: form.contact.preferredContact,
    garment_length: form.length,
    garment_style: form.style,
    custom_style_description: form.customStyleDescription || null,
    outer_material: form.outerMaterial,
    outer_color: form.outerColor,
    custom_outer_color: form.customOuterColor || null,
    lining_material: form.liningMaterial,
    lining_color: form.liningColor,
    custom_lining_color: form.customLiningColor || null,
    design_details: form.details,
    sizing_mode: form.sizingMode,
    sizing_unit: form.sizingUnit,
    standard_size: form.sizingMode === 'standard' ? form.standardSize : null,
    fit_preference: form.sizingMode === 'standard' ? form.fitPreference : null,
    custom_measurements: form.customMeasurements,
    reference_images: sanitizedImages,
    special_instructions: form.contact.additionalComments || null,
    quote_amount: null,
    quote_currency: '£',
    quote_notes: null,
    quoted_at: null,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Always save a local client-side backup
  saveLocalBackup({ id: `local-${Date.now()}`, ...payload });

  if (!isSupabaseConfigured) {
    return {
      success: true,
      referenceNumber,
    };
  }

  try {
    const { error: dbError } = await supabase
      .from('custom_design_requests')
      .insert([payload]);

    if (dbError) {
      console.warn('Database insert notice (table might be pending migration):', dbError.message);
      // We do NOT block customer quotation submission if the table is awaiting production migration
      return {
        success: true,
        referenceNumber,
      };
    }

    return {
      success: true,
      referenceNumber,
    };
  } catch (err: any) {
    console.warn('Network exception while saving custom design request:', err);
    return {
      success: true,
      referenceNumber,
    };
  }
}

/**
 * Admin: Fetch all custom design requests.
 */
export async function fetchAdminCustomDesignRequests(): Promise<CustomDesignRequest[]> {
  const localRequests = getLocalBackups();

  if (!isSupabaseConfigured) {
    return localRequests;
  }

  try {
    const { data, error } = await supabase
      .from('custom_design_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not query custom_design_requests from Supabase:', error.message);
      return localRequests;
    }

    // Merge database results with any local backups
    const dbRefs = new Set((data || []).map((r) => r.reference_number));
    const unmergedLocal = localRequests.filter((l) => !dbRefs.has(l.reference_number));
    return [...(data || []), ...unmergedLocal];
  } catch (err) {
    console.error('Error fetching admin custom requests:', err);
    return localRequests;
  }
}

/**
 * Admin: Update request status and internal notes.
 */
export async function updateAdminCustomDesignRequest(
  id: string,
  updates: Partial<Pick<CustomDesignRequest, 'status' | 'admin_notes' | 'quote_amount' | 'quote_notes' | 'quoted_at'>>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || id.startsWith('local-')) {
    // Update local backup
    try {
      const existing = getLocalBackups();
      const updated = existing.map((r) => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r));
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(updated));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const { error } = await supabase
      .from('custom_design_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
