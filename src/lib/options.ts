import { ProductOption, ProductOptionType } from '../types';

const VALID_OPTION_TYPES: ProductOptionType[] = [
  'select',
  'radio',
  'color',
  'text',
  'textarea',
];

/**
 * Robustly normalizes product options from various Supabase formats:
 * - Direct ProductOption[] array
 * - JSON string (e.g. '[{"name":"Color",...}]')
 * - Double JSON stringified
 * - Mixed or partially formatted option objects
 */
export function normalizeProductOptions(rawOptions: unknown): ProductOption[] {
  if (!rawOptions) return [];

  let parsed: unknown = rawOptions;

  // Handle JSON stringified options from database or API
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  // Defensively handle double-stringified JSON
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed.trim());
    } catch {
      return [];
    }
  }

  // If a single object was passed instead of an array
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if ('name' in (parsed as Record<string, unknown>)) {
      parsed = [parsed];
    } else {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return (parsed as any[])
    .filter((opt) => opt && typeof opt === 'object' && opt.name)
    .map((opt) => {
      let values: string[] = [];
      if (Array.isArray(opt.values)) {
        values = opt.values.map((v: any) => String(v ?? '').trim()).filter(Boolean);
      } else if (typeof opt.values === 'string') {
        values = opt.values
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean);
      }

      const rawType = String(opt.type || 'select').toLowerCase().trim() as ProductOptionType;
      const type: ProductOptionType = VALID_OPTION_TYPES.includes(rawType) ? rawType : 'select';

      return {
        name: String(opt.name).trim(),
        type,
        required: Boolean(opt.required),
        values,
        label: opt.label ? String(opt.label).trim() : undefined,
        placeholder: opt.placeholder ? String(opt.placeholder).trim() : undefined,
      };
    });
}
