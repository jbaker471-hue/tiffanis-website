// Product catalog and pricing logic — pure data/functions, no React, so it
// can be imported by both the client (App.jsx) and tested directly without
// rendering anything. The server-side price table in
// netlify/functions/create-checkout.js is a separate, hand-written copy
// (Netlify Functions can't import a Vite-bundled ES module), which is
// exactly why test/price-consistency.test.js exists: to fail loudly if the
// two ever drift apart.

export const ADULT_SIZES = ["XS","S","M","L","XL","2XL","3XL","4XL","5XL"];
export const YOUTH_SIZES = ["YXS","YS","YM","YL","YXL"];
export const BIG_SIZES   = ["2XL","3XL","4XL","5XL"]; // adult upcharge sizes
export const SIZES = [...YOUTH_SIZES, ...ADULT_SIZES];

// ─── PRODUCT CATALOG: Age group → Brand → Style ────────────────────────────────
// Each "style" is a sellable product. id is globally unique so the rest of the
// app (orders, pricing, colors) can reference a single flat key.
export const CATALOG = {
  adult: {
    label: "Adult",
    sizes: ADULT_SIZES,
    brands: [
      {
        id:"gildan", name:"Gildan", colorKey:"gildan",
        styles:[
          { id:"gildan_ss",    label:"Short Sleeve", desc:"S–XL $17 · 2XL–5XL $20", basePrice:17, bigPrice:20 },
          { id:"gildan_ls",    label:"Long Sleeve",  desc:"S–XL $20 · 2XL–5XL $25", basePrice:20, bigPrice:25 },
          { id:"gildan_sweat", label:"Sweatshirt",   desc:"S–XL $25 · 2XL–5XL $30", basePrice:25, bigPrice:30 },
          { id:"gildan_hoodie",label:"Hoodie",       desc:"S–XL $30 · 2XL–5XL $35", basePrice:30, bigPrice:35 },
        ],
      },
      {
        id:"bella", name:"Bella+Canvas", colorKey:"bella",
        styles:[
          { id:"bella_ss",     label:"Short Sleeve", desc:"Soft tri-blend, fitted · S–XL $20 · 2XL+ $25", basePrice:20, bigPrice:25 },
        ],
      },
      {
        id:"comfort", name:"Comfort Colors", colorKey:"comfort",
        styles:[
          { id:"comfort_ss",   label:"Short Sleeve", desc:"Pigment-dyed, vintage feel · S–XL $20 · 2XL+ $25", basePrice:20, bigPrice:25 },
        ],
      },
    ],
  },
  child: {
    label: "Children",
    sizes: YOUTH_SIZES,
    brands: [
      {
        id:"bella", name:"Bella+Canvas", colorKey:"bella",
        styles:[ { id:"child_bella", label:"Youth Tee", desc:"Youth XS–XL · $13", basePrice:13, bigPrice:13 } ],
      },
      {
        id:"rabbitskins", name:"Rabbit Skins", colorKey:"gildan",
        styles:[ { id:"child_rabbit", label:"Youth Tee", desc:"Youth XS–XL · $13", basePrice:13, bigPrice:13 } ],
      },
      {
        id:"gildan", name:"Gildan", colorKey:"gildan",
        styles:[ { id:"child_gildan", label:"Youth Tee", desc:"Youth XS–XL · $13", basePrice:13, bigPrice:13 } ],
      },
      {
        id:"comfort", name:"Comfort Colors", colorKey:"comfort",
        styles:[ { id:"child_comfort", label:"Youth Tee", desc:"Youth XS–XL · $13", basePrice:13, bigPrice:13 } ],
      },
    ],
  },
};

// DTF print-only stays as a standalone option
export const DTF_ONLY = { id:"dtf_only", label:"DTF Print Only", desc:"Flat rate per print up to 12×15″ — shirt not included", basePrice:10, bigPrice:10, colorKey:"comfort" };

// Flatten every style into a lookup keyed by its unique style id.
export const PRODUCTS = (() => {
  const map = {};
  Object.entries(CATALOG).forEach(([ageId, age]) => {
    age.brands.forEach(brand => {
      brand.styles.forEach(style => {
        map[style.id] = {
          ...style,
          ageId,
          sizes: age.sizes,
          brandId: brand.id,
          brandName: brand.name,
          colorKey: brand.colorKey,
          // Combined display name e.g. "Gildan Short Sleeve"
          name: `${brand.name} ${style.label}`,
        };
      });
    });
  });
  map[DTF_ONLY.id] = { ...DTF_ONLY, ageId:"adult", sizes:ADULT_SIZES, brandId:"dtf", brandName:"DTF", name:DTF_ONLY.label };
  return map;
})();

export const DEFAULT_PRODUCT_ID = "comfort_ss";

export function getProduct(productId) {
  return PRODUCTS[productId] || PRODUCTS[DEFAULT_PRODUCT_ID];
}

export function getSizesForBrand(productId) {
  return getProduct(productId).sizes;
}

export function getPrice(productId, size) {
  const p = getProduct(productId);
  return BIG_SIZES.includes(size) ? p.bigPrice : p.basePrice;
}

export function calcTotal(productId, items) {
  return items.reduce((sum,i)=>{
    const price = getPrice(productId, i.size);
    return sum + (price * Number(i.qty||1));
  },0);
}
