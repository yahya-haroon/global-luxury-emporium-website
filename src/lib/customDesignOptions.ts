import {
  GarmentLength,
  GarmentStyle,
  OuterMaterial,
  LiningMaterial,
  CollarStyle,
  ClosureType,
  PocketConfig,
  HardwareFinish,
  StandardSize,
  CustomDesignFormState,
} from '../types/customDesign';

export interface LengthOption {
  id: GarmentLength;
  label: string;
  tagline: string;
  description: string;
  silhouetteSvg: string;
}

export const GARMENT_LENGTH_OPTIONS: LengthOption[] = [
  {
    id: 'full_length',
    label: 'Full-Length Coat',
    tagline: 'Ankle to Mid-Calf Silhouette',
    description: 'Dramatic architectural drape offering full-length weather protection and sophisticated presence.',
    silhouetteSvg: 'M18 10 L32 10 L36 28 L42 90 L8 90 L14 28 Z',
  },
  {
    id: 'three_quarter',
    label: 'Three-Quarter Coat',
    tagline: 'Knee to Mid-Thigh Length',
    description: 'Versatile overcoat proportion designed to wear gracefully over formal tailoring or casual attire.',
    silhouetteSvg: 'M18 10 L32 10 L36 26 L40 70 L10 70 L14 26 Z',
  },
  {
    id: 'standard',
    label: 'Standard Jacket',
    tagline: 'Classic Hip-Length Cut',
    description: 'The definitive luxury leather jacket profile resting comfortably at the hips for everyday styling.',
    silhouetteSvg: 'M18 10 L32 10 L37 25 L39 54 L11 54 L13 25 Z',
  },
  {
    id: 'cropped',
    label: 'Cropped Jacket',
    tagline: 'Waist-Skimming Modern Silhouette',
    description: 'Contemporary, high-waisted cut that elongates leg lines and delivers bold runway impact.',
    silhouetteSvg: 'M18 10 L32 10 L38 25 L38 42 L12 42 L12 25 Z',
  },
];

export interface StyleOption {
  id: GarmentStyle;
  label: string;
  category: string;
  description: string;
  recommendedLengths: GarmentLength[];
  defaultHardware: HardwareFinish;
}

export const GARMENT_STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'biker',
    label: 'Biker Jacket',
    category: 'Iconic Rider',
    description: 'Asymmetric front zipper, wide snap-down notched lapels, and sculpted zippered cuffs.',
    recommendedLengths: ['standard', 'cropped'],
    defaultHardware: 'polished_silver',
  },
  {
    id: 'bomber',
    label: 'Bomber Jacket',
    category: 'Flight Heritage',
    description: 'Clean low-profile knit collar, raglan or drop shoulders, rib-knit cuffs, and storm flap.',
    recommendedLengths: ['standard'],
    defaultHardware: 'antique_brass',
  },
  {
    id: 'racer',
    label: 'Racer Jacket',
    category: 'Café Minimalist',
    description: 'Streamlined band collar with throat latch, straight central zip, and contoured ergonomic fit.',
    recommendedLengths: ['standard'],
    defaultHardware: 'matte_gunmetal',
  },
  {
    id: 'aviator',
    label: 'Aviator Jacket',
    category: 'Artisanal Warmth',
    description: 'Expansive shearling or fleece foldover collar, twin throat buckles, and warm plush lining.',
    recommendedLengths: ['standard', 'three_quarter'],
    defaultHardware: 'antique_brass',
  },
  {
    id: 'puffer',
    label: 'Puffer Jacket',
    category: 'Quilted Volume',
    description: 'Plush diamond or horizontal baffled chambers filled with lightweight thermal insulation.',
    recommendedLengths: ['standard', 'cropped', 'three_quarter'],
    defaultHardware: 'polished_silver',
  },
  {
    id: 'trucker',
    label: 'Trucker Jacket',
    category: 'Heritage Western',
    description: 'Classic point collar, flap button chest pockets, waist adjusters, and vertical seam accents.',
    recommendedLengths: ['standard', 'cropped'],
    defaultHardware: 'antique_brass',
  },
  {
    id: 'shearling',
    label: 'Shearling Coat',
    category: 'Nordic Luxury',
    description: 'Dense natural pelts with exposed fur trims at the collar, cuffs, and hem for absolute luxury warmth.',
    recommendedLengths: ['standard', 'three_quarter', 'full_length'],
    defaultHardware: 'antique_brass',
  },
  {
    id: 'blazer',
    label: 'Leather Blazer',
    category: 'Tailored Sartorial',
    description: 'Structured shoulders, notched or peaked lapels, horn button single/double closure, and flap pockets.',
    recommendedLengths: ['standard', 'three_quarter'],
    defaultHardware: 'no_preference',
  },
  {
    id: 'wool_coat',
    label: 'Wool & Leather Coat',
    category: 'Overcoat Elegance',
    description: 'Heavyweight Melton wool body paired with handcrafted leather accents, collar, and sleeve panels.',
    recommendedLengths: ['three_quarter', 'full_length'],
    defaultHardware: 'antique_brass',
  },
  {
    id: 'custom',
    label: 'Other / Custom Silhouette',
    category: 'Bespoke Concept',
    description: 'Submit your bespoke sketch, vintage reference, or hybrid concept for an entirely custom construction.',
    recommendedLengths: ['full_length', 'three_quarter', 'standard', 'cropped'],
    defaultHardware: 'no_preference',
  },
];

export interface OuterMaterialOption {
  id: OuterMaterial;
  label: string;
  origin: string;
  description: string;
  temperament: string;
  badge?: string;
}

export const OUTER_MATERIAL_OPTIONS: OuterMaterialOption[] = [
  {
    id: 'genuine_leather',
    label: 'Genuine Full-Grain Leather',
    origin: 'Hand-selected European Cowhide',
    description: 'Heavyweight, naturally textured steerhide with authentic grain patterns that patina richly with time.',
    temperament: 'Durable, structured, windproof',
    badge: 'Signature',
  },
  {
    id: 'lambskin',
    label: 'Italian Lambskin',
    origin: 'Tuscany, Italy',
    description: 'Incomparably soft and supple, offering buttery touch and gentle drape suited for refined luxury wear.',
    temperament: 'Featherlight, buttery soft, elegant drape',
    badge: 'Popular',
  },
  {
    id: 'sheepskin',
    label: 'Spanish Sheepskin',
    origin: 'Castilla, Spain',
    description: 'Densely textured leather with natural thermal insulation and natural water-resistant lanolin properties.',
    temperament: 'Plush, warm, resilient',
  },
  {
    id: 'nappa',
    label: 'Ultra-Smooth Nappa Leather',
    origin: 'Northern Italy',
    description: 'Micro-pigmented, impeccably smooth full grain with a silky satin sheen and supple glove-soft handfeel.',
    temperament: 'Smooth, sleek, contemporary finish',
  },
  {
    id: 'suede',
    label: 'Velvet Suede Leather',
    origin: 'Bavaria & Piedmont',
    description: 'Delicately buffed nap leather with a rich tactile depth, matte appearance, and heritage refinement.',
    temperament: 'Matte, velvet texture, breathable',
  },
  {
    id: 'wool',
    label: 'Double-Faced Melton Wool',
    origin: 'Yorkshire, United Kingdom',
    description: 'Heavyweight 800gsm tightly woven British wool blend that provides superb thermal structure.',
    temperament: 'Tailored, warm, wind-resistant',
  },
  {
    id: 'other',
    label: 'Other / Special Request',
    origin: 'Custom Atelier Sourcing',
    description: 'Exotic leathers, vegan alternatives, waxed canvas, or customer-provided fabric discussed upon quote.',
    temperament: 'To be confirmed during quotation',
  },
];

export interface SwatchColor {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const OUTER_COLORS: SwatchColor[] = [
  { id: 'black', name: 'Midnight Onyx Black', hex: '#141210', description: 'Deep, rich timeless black with subtle luster.' },
  { id: 'dark_brown', name: 'Vintage Dark Espresso', hex: '#2E1C14', description: 'Rich deep coffee hue with antique depth.' },
  { id: 'tan', name: 'Cognac Saddle Tan', hex: '#8C5831', description: 'Warm amber caramel tone reminiscent of equestrian leather.' },
  { id: 'burgundy', name: 'Royal Bordeaux Burgundy', hex: '#4A121A', description: 'Deep wine burgundy radiating luxury.' },
  { id: 'navy', name: 'Savile Row Navy', hex: '#182433', description: 'Dark midnight navy blue tailored elegance.' },
  { id: 'forest_green', name: 'British Racing Green', hex: '#1C3127', description: 'Subtle dark botanical green with earthy character.' },
  { id: 'grey', name: 'Charcoal Slate', hex: '#444648', description: 'Cool urban mineral grey with understated refinement.' },
  { id: 'white', name: 'Chalk White', hex: '#F0EFEA', description: 'Crisp architectural ivory-white statement leather.' },
  { id: 'cream', name: 'Warm Cream Silk', hex: '#E4DAC8', description: 'Soft cashmere cream bringing warmth to lighter cuts.' },
  { id: 'red', name: 'Oxblood Crimson', hex: '#7A1818', description: 'Bold heritage red carrying striking presence.' },
  { id: 'custom', name: 'Custom Colour Request', hex: '#A89F8B', description: 'Provide your Pantone or color reference.' },
];

export interface LiningMaterialOption {
  id: LiningMaterial;
  label: string;
  description: string;
  warmth: string;
}

export const LINING_MATERIALS: LiningMaterialOption[] = [
  {
    id: 'standard',
    label: 'Breathable Twill Lining',
    description: 'High-density cupro twill offering frictionless glide over shirting with optimal year-round breathability.',
    warmth: 'All-season comfort',
  },
  {
    id: 'satin',
    label: 'Silk-Satin Jacquard',
    description: 'Opulent silk-blend satin with subtle tone-on-tone weave for an extraordinarily smooth slip.',
    warmth: 'Gentle glide & luxury touch',
  },
  {
    id: 'quilted',
    label: 'Diamond Quilted Thermal',
    description: 'Lightweight poly-fill insulated diamond chambers that lock in body warmth without bulk.',
    warmth: 'Enhanced thermal insulation',
  },
  {
    id: 'fleece',
    label: 'Microfleece Lining',
    description: 'Brushed thermal fleece interior offering immediate cozy warmth on crisp autumn and winter days.',
    warmth: 'Substantial cold-weather warmth',
  },
  {
    id: 'shearling',
    label: 'Full Shearling Wool',
    description: '100% natural plush lamb shearling pelts providing supreme sub-zero insulation and tactile comfort.',
    warmth: 'Maximum arctic thermal protection',
  },
  {
    id: 'other',
    label: 'Other / Bespoke Fabric',
    description: 'Custom tartan, monogram print, or client-specified lining material confirmed during quotation.',
    warmth: 'To be confirmed upon quote',
  },
];

export const LINING_COLORS: SwatchColor[] = [
  { id: 'black', name: 'Obsidian Black', hex: '#151515', description: 'Classic clean black lining.' },
  { id: 'brown', name: 'Warm Tobacco', hex: '#3B271E', description: 'Earthy golden brown.' },
  { id: 'burgundy', name: 'Ruby Wine', hex: '#52141F', description: 'Contrasting royal scarlet wine.' },
  { id: 'navy', name: 'Regent Navy', hex: '#162338', description: 'Deep nautical midnight navy.' },
  { id: 'grey', name: 'Dove Grey', hex: '#58595B', description: 'Subtle slate grey.' },
  { id: 'cream', name: 'Champagne Cream', hex: '#DFD8C8', description: 'Warm lustrous pale cream.' },
  { id: 'red', name: 'Imperial Red', hex: '#871414', description: 'Bold contrasting luxury red.' },
  { id: 'custom', name: 'Custom Lining Shade', hex: '#A89F8B', description: 'Matched to your custom design.' },
];

export const COLLAR_OPTIONS: { id: CollarStyle; label: string; description: string }[] = [
  { id: 'band_collar', label: 'Minimalist Band / Cafe Collar', description: 'Clean upright moto band collar with snap closure.' },
  { id: 'notch_lapel', label: 'Wide Notched Biker Lapels', description: 'Classic fold-over lapels with snap fasteners.' },
  { id: 'shirt_collar', label: 'Pointed Shirt Collar', description: 'Refined fold-down point collar for a clean look.' },
  { id: 'shearling_collar', label: 'Plush Shearling Collar', description: 'Warm thick shearling sheepskin collar.' },
  { id: 'hooded', label: 'Attached Hood / Detachable Hood', description: 'Casual storm hood tailored from leather or fleece.' },
  { id: 'no_preference', label: 'Atelier Recommendation / No Preference', description: 'Our master patternmaker will choose the best proportion.' },
];

export const CLOSURE_OPTIONS: { id: ClosureType; label: string; description: string }[] = [
  { id: 'asymmetrical_zip', label: 'Asymmetrical Heavy Metal Zip', description: 'Diagonal front zipper defining the authentic rider style.' },
  { id: 'center_zip', label: 'Central Straight Heavy Metal Zip', description: 'Clean symmetrical front zipper with storm under-flap.' },
  { id: 'horn_buttons', label: 'Natural Buffalo Horn Buttons', description: 'Traditional horn buttons individually stitched.' },
  { id: 'snap_buttons', label: 'Concealed Metal Snap Studs', description: 'Sleek flush studs hidden under a smooth placket.' },
  { id: 'double_breasted_buttons', label: 'Double-Breasted Button Array', description: 'Sartorial nautical overcoat closure.' },
  { id: 'no_preference', label: 'Atelier Recommendation', description: 'Optimized for the chosen silhouette.' },
];

export const POCKET_OPTIONS: { id: PocketConfig; label: string; description: string }[] = [
  { id: 'slash_zip_pockets', label: 'Angled Zip Waist Pockets', description: 'Slanted welt pockets secured with metal zip pulls.' },
  { id: 'flap_cargo_pockets', label: 'Box-Pleat Flap Pockets', description: 'Spacious military/western style flap pockets with snap buttons.' },
  { id: 'dual_chest_pockets', label: 'Dual Horizontal Zip Chest Pockets', description: 'Sporty biker aesthetic with upper chest zip compartments.' },
  { id: 'minimal_welt_pockets', label: 'Minimalist In-Seam Welt Pockets', description: 'Ultra-clean hidden side pockets without visible bulk.' },
  { id: 'no_preference', label: 'Atelier Recommendation', description: 'Matched to your chosen jacket style.' },
];

export const HARDWARE_FINISHES: { id: HardwareFinish; label: string; previewColor: string; description: string }[] = [
  { id: 'polished_silver', label: 'Polished Chrome / Silver', previewColor: '#E0E0E0', description: 'Brilliant mirror chrome with high contrast.' },
  { id: 'antique_brass', label: 'Antique Vintage Brass', previewColor: '#B5935A', description: 'Muted warm brass carrying timeless heritage appeal.' },
  { id: 'matte_gunmetal', label: 'Matte Stealth Gunmetal', previewColor: '#3A3A3A', description: 'Dark blackened titanium-style hardware.' },
  { id: 'light_gold', label: 'Artisanal Pale Gold', previewColor: '#D4AF37', description: 'Subtle luxury pale gold with warm sheen.' },
  { id: 'no_preference', label: 'Standard Atelier Match', previewColor: '#888888', description: 'Selected based on your leather shade.' },
];

export const STANDARD_SIZES: StandardSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export const INITIAL_CUSTOM_DESIGN_STATE: CustomDesignFormState = {
  length: 'standard',
  style: 'biker',
  customStyleDescription: '',
  outerMaterial: 'lambskin',
  outerColor: 'black',
  customOuterColor: '',
  liningMaterial: 'satin',
  liningColor: 'burgundy',
  customLiningColor: '',
  details: {
    collarStyle: 'notch_lapel',
    closureType: 'asymmetrical_zip',
    pocketConfig: 'slash_zip_pockets',
    cuffStyle: 'zippered_gusset',
    hardwareFinish: 'polished_silver',
    beltStyle: 'removable_waist_belt',
    stitchingTone: 'matching_tone',
    removableCollar: false,
    monogramText: '',
    specialRequirements: '',
  },
  sizingMode: 'standard',
  sizingUnit: 'inches',
  standardSize: 'M',
  fitPreference: 'regular',
  customMeasurements: {
    chest: '',
    waist: '',
    shoulder: '',
    sleeveLength: '',
    garmentLength: '',
    hips: '',
    fitNotes: '',
  },
  referenceImages: [],
  contact: {
    fullName: '',
    email: '',
    phone: '',
    country: 'United Kingdom',
    preferredContact: 'email',
    additionalComments: '',
  },
};
