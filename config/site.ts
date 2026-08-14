// config/site.ts

export const siteConfig = {
  // Cooperative / Organization Identity
  name: process.env.NEXT_PUBLIC_COOP_NAME || "Evergreen Saving & Credit Cooperative",
  shortName: process.env.NEXT_PUBLIC_COOP_SHORT_NAME || "Evergreen",
  registrationNo: process.env.NEXT_PUBLIC_COOP_REG_NO || "", // Optional Reg/PAN No for Slips
  
  // Location & Contact
  address: process.env.NEXT_PUBLIC_COOP_ADDRESS || "Birgunj, Nepal",
  phone: process.env.NEXT_PUBLIC_COOP_PHONE || "",
  email: process.env.NEXT_PUBLIC_COOP_EMAIL || "",

  // Currency & Locale
  currency: {
    symbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "NPR ",
    code: process.env.NEXT_PUBLIC_CURRENCY_CODE || "NPR",
    locale: "en-IN", // Indian/Nepali number system: 1,00,000
  },

  // Custom Voucher Prefixes
  codePrefixes: {
    deposit: process.env.NEXT_PUBLIC_PREFIX_DEPOSIT || "DP",
    loan: process.env.NEXT_PUBLIC_PREFIX_LOAN || "LN",
    payment: process.env.NEXT_PUBLIC_PREFIX_PAYMENT || "PY",
    fine: process.env.NEXT_PUBLIC_PREFIX_FINE || "PFN",
  },

  // Branding
  branding: {
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "/logo.png",
  },
};

// Global Currency Formatter Helper
export function formatMoney(amount: number | string): string {
  const val = Number(amount) || 0;
  return `${siteConfig.currency.symbol}${val.toLocaleString(siteConfig.currency.locale)}`;
}