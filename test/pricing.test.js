import { describe, it, expect } from "vitest";
import { PRODUCTS, getProduct, getPrice, calcTotal, BIG_SIZES, DEFAULT_PRODUCT_ID } from "../src/pricing.js";

describe("getPrice", () => {
  it("charges base price for regular sizes", () => {
    expect(getPrice("gildan_ss", "M")).toBe(17);
    expect(getPrice("gildan_ss", "XL")).toBe(17);
  });

  it("charges the big-size upcharge for 2XL and up", () => {
    for (const size of BIG_SIZES) {
      expect(getPrice("gildan_ss", size)).toBe(20);
    }
  });

  it("prices every real product/style combination as a positive number", () => {
    for (const [id, product] of Object.entries(PRODUCTS)) {
      for (const size of product.sizes) {
        const price = getPrice(id, size);
        expect(price, `${id} / ${size}`).toBeGreaterThan(0);
      }
    }
  });

  it("youth tees are flat-priced regardless of size (no youth size is a BIG_SIZE)", () => {
    const youthIds = Object.values(PRODUCTS).filter(p => p.ageId === "child").map(p => p.id);
    for (const id of youthIds) {
      const prices = new Set(PRODUCTS[id].sizes.map(size => getPrice(id, size)));
      expect(prices.size, `${id} should have one flat price`).toBe(1);
    }
  });

  it("falls back to the default product for an unknown id instead of throwing", () => {
    expect(getProduct("not-a-real-product")).toBe(getProduct(DEFAULT_PRODUCT_ID));
    expect(() => getPrice("not-a-real-product", "M")).not.toThrow();
  });
});

describe("calcTotal", () => {
  it("sums price * qty across items", () => {
    const total = calcTotal("gildan_ss", [{ size: "M", qty: 2 }, { size: "2XL", qty: 1 }]);
    expect(total).toBe(17 * 2 + 20 * 1);
  });

  it("treats a missing/zero qty as 1, never as free", () => {
    expect(calcTotal("gildan_ss", [{ size: "M", qty: 0 }])).toBe(17);
    expect(calcTotal("gildan_ss", [{ size: "M" }])).toBe(17);
  });

  it("returns 0 for an empty cart line", () => {
    expect(calcTotal("gildan_ss", [])).toBe(0);
  });
});
