export type GarmentLength = 'full_length' | 'three_quarter' | 'standard' | 'cropped';

export type GarmentStyle =
  | 'biker'
  | 'puffer'
  | 'bomber'
  | 'aviator'
  | 'racer'
  | 'trucker'
  | 'shearling'
  | 'blazer'
  | 'wool_coat'
  | 'custom';

export type OuterMaterial =
  | 'genuine_leather'
  | 'lambskin'
  | 'sheepskin'
  | 'nappa'
  | 'suede'
  | 'wool'
  | 'other';

export type OuterColorId =
  | 'black'
  | 'dark_brown'
  | 'tan'
  | 'burgundy'
  | 'navy'
  | 'forest_green'
  | 'grey'
  | 'white'
  | 'cream'
  | 'red'
  | 'custom';

export type LiningMaterial =
  | 'standard'
  | 'satin'
  | 'quilted'
  | 'fleece'
  | 'shearling'
  | 'other';

export type LiningColorId =
  | 'black'
  | 'brown'
  | 'burgundy'
  | 'navy'
  | 'grey'
  | 'cream'
  | 'red'
  | 'custom';

export type CollarStyle =
  | 'band_collar'
  | 'notch_lapel'
  | 'shirt_collar'
  | 'shearling_collar'
  | 'hooded'
  | 'no_preference';

export type ClosureType =
  | 'asymmetrical_zip'
  | 'center_zip'
  | 'horn_buttons'
  | 'snap_buttons'
  | 'double_breasted_buttons'
  | 'no_preference';

export type PocketConfig =
  | 'slash_zip_pockets'
  | 'flap_cargo_pockets'
  | 'dual_chest_pockets'
  | 'minimal_welt_pockets'
  | 'no_preference';

export type CuffStyle =
  | 'zippered_gusset'
  | 'buttoned_tab'
  | 'ribbed_knit'
  | 'clean_tailored'
  | 'no_preference';

export type HardwareFinish =
  | 'antique_brass'
  | 'polished_silver'
  | 'matte_gunmetal'
  | 'light_gold'
  | 'no_preference';

export type BeltStyle =
  | 'removable_waist_belt'
  | 'side_cinch_tabs'
  | 'elasticated_hem'
  | 'clean_tailored'
  | 'no_preference';

export type StitchingTone =
  | 'matching_tone'
  | 'contrast_cream'
  | 'contrast_gold'
  | 'no_preference';

export interface DesignDetails {
  collarStyle: CollarStyle;
  closureType: ClosureType;
  pocketConfig: PocketConfig;
  cuffStyle: CuffStyle;
  hardwareFinish: HardwareFinish;
  beltStyle: BeltStyle;
  stitchingTone: StitchingTone;
  removableCollar: boolean;
  monogramText: string;
  specialRequirements: string;
}

export type SizingMode = 'standard' | 'custom';
export type SizingUnit = 'cm' | 'inches';
export type StandardSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';
export type FitPreference = 'slim' | 'regular' | 'relaxed';

export interface CustomMeasurements {
  chest?: string;
  waist?: string;
  shoulder?: string;
  sleeveLength?: string;
  garmentLength?: string;
  hips?: string;
  fitNotes?: string;
}

export interface ReferenceImageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  label: 'Front' | 'Back' | 'Side' | 'Detail' | 'Inspiration';
  dataUrl?: string;
  storagePath?: string;
}

export type PreferredContact = 'email' | 'whatsapp' | 'phone';

export interface CustomerContact {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  preferredContact: PreferredContact;
  additionalComments?: string;
}

export interface CustomDesignFormState {
  length: GarmentLength;
  style: GarmentStyle;
  customStyleDescription: string;
  outerMaterial: OuterMaterial;
  outerColor: OuterColorId;
  customOuterColor: string;
  liningMaterial: LiningMaterial;
  liningColor: LiningColorId;
  customLiningColor: string;
  details: DesignDetails;
  sizingMode: SizingMode;
  sizingUnit: SizingUnit;
  standardSize: StandardSize;
  fitPreference: FitPreference;
  customMeasurements: CustomMeasurements;
  referenceImages: ReferenceImageFile[];
  contact: CustomerContact;
}

export type CustomDesignRequestStatus =
  | 'new'
  | 'under_review'
  | 'more_info_needed'
  | 'quote_prepared'
  | 'quote_sent'
  | 'approved'
  | 'in_production'
  | 'completed'
  | 'declined';

export interface CustomDesignRequest {
  id: string;
  reference_number: string;
  status: CustomDesignRequestStatus;
  customer_name: string;
  email: string;
  phone: string;
  country: string;
  preferred_contact: PreferredContact;
  garment_length: GarmentLength;
  garment_style: GarmentStyle;
  custom_style_description?: string | null;
  outer_material: OuterMaterial;
  outer_color: OuterColorId;
  custom_outer_color?: string | null;
  lining_material: LiningMaterial;
  lining_color: LiningColorId;
  custom_lining_color?: string | null;
  design_details: DesignDetails;
  sizing_mode: SizingMode;
  sizing_unit: SizingUnit;
  standard_size?: StandardSize | null;
  fit_preference?: FitPreference | null;
  custom_measurements: CustomMeasurements;
  reference_images: ReferenceImageFile[];
  special_instructions?: string | null;
  quote_amount?: number | null;
  quote_currency?: string | null;
  quote_notes?: string | null;
  quoted_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
}
