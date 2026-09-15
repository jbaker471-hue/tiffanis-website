// The Stripe checkout function keeps its own copy of the price table (see
// the comment in create-checkout.js for why: Netlify Functions run as
// CommonJS and can't import a Vite-bundled ES module). That duplication is
// exactly the kind of thing that quietly drifts — someone changes a price
// in the storefront and forgets the server-side copy exists. This test
// fails loudly if that ever happens, by checking every real product/size
// combination against both sources of truth.
import { describe, it, expect } from "vitest";
import { PRODUCTS, getPrice, BIG_SIZES as CLIENT_BIG_SIZES } from "../src/pricing.js";
import * as checkout from "../netlify/functions/create-checkout.js";

describe("server-side price table matches the client catalog", () => {
  it("has the same big-size list", () => {
    expect([...checkout.BIG_SIZES].sort()).toEqual([...CLIENT_BIG_SIZES].sort());
  });

  it("has an entry for every real product name", () => {
    for (const product of Object.values(PRODUCTS)) {
      expect(checkout.PRICE_TABLE[product.name], product.name).toBeDefined();
    }
  });

  it("charges the identical price, for every product and every size it sells", () => {
    for (const product of Object.values(PRODUCTS)) {
      for (const size of product.sizes) {
        const clientPrice = getPrice(product.id, size);
        const serverPrice = checkout.realPriceFor({ brand: product.name, size });
        expect(serverPrice, `${product.name} / ${size}`).toBe(clientPrice);
      }
    }
  });

  it("refuses to price an unrecognized product name rather than guessing", () => {
    expect(checkout.realPriceFor({ brand: "Not A Real Product", size: "M" })).toBeNull();
  });
});
