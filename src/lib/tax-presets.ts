export type TaxPreset = {
  label: string;
  servicePercent: number;
  taxPercent: number;
};

const MYR: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "SST 6%", servicePercent: 0, taxPercent: 6 },
  { label: "SST 6% + Service 10%", servicePercent: 10, taxPercent: 6 },
  { label: "SST 8% (alcohol)", servicePercent: 0, taxPercent: 8 },
  { label: "SST 8% + Service 10%", servicePercent: 10, taxPercent: 8 },
];

const USD: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "Tip 15%", servicePercent: 15, taxPercent: 0 },
  { label: "Tip 18%", servicePercent: 18, taxPercent: 0 },
  { label: "Tip 20%", servicePercent: 20, taxPercent: 0 },
];

const EUR: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "VAT 20%", servicePercent: 0, taxPercent: 20 },
  { label: "Service 12.5%", servicePercent: 12.5, taxPercent: 0 },
];

const GBP: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "VAT 20%", servicePercent: 0, taxPercent: 20 },
  { label: "Service 12.5%", servicePercent: 12.5, taxPercent: 0 },
];

const SGD: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "GST 9%", servicePercent: 0, taxPercent: 9 },
  { label: "GST 9% + Service 10%", servicePercent: 10, taxPercent: 9 },
];

const AUD: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "GST 10%", servicePercent: 0, taxPercent: 10 },
];

const GENERIC: TaxPreset[] = [
  { label: "None", servicePercent: 0, taxPercent: 0 },
  { label: "Tax 10%", servicePercent: 0, taxPercent: 10 },
  { label: "Service 10%", servicePercent: 10, taxPercent: 0 },
];

const PRESETS: Record<string, TaxPreset[]> = {
  MYR,
  USD,
  EUR,
  GBP,
  SGD,
  AUD,
};

export function getTaxPresets(currency: string): TaxPreset[] {
  return PRESETS[currency.toUpperCase()] ?? GENERIC;
}
