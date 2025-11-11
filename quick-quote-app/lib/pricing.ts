/**
 * Pricing Resolver
 * Handles price lookups with precedence and quote calculations
 */

import type { BOMLine } from "./types";

export interface Product {
  code: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
}

export interface PriceListEntry {
  product_code: string;
  unit_price: number;
}

export interface PriceList {
  id: string;
  name: string;
  currency: string;
  valid_from: Date;
  valid_to?: Date;
  entries: PriceListEntry[];
}

export interface PricingContext {
  customer_id?: string;
  org_id?: string;
  currency: string;
  quote_date: Date;
}

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
}

export interface PricedBOMLine extends BOMLine {
  unit_price: number;
  line_total: number;
}

export interface PricingResult {
  bom: PricedBOMLine[];
  totals: QuoteTotals;
  missing_prices: string[];
  price_list_id: string;
}

export class PricingResolver {
  private products: Map<string, Product> = new Map();
  private globalPriceList: PriceList | null = null;
  private orgPriceLists: Map<string, PriceList> = new Map();
  private customerPriceLists: Map<string, PriceList> = new Map();

  /**
   * Load products from products data
   */
  loadProducts(products: Product[]): void {
    this.products.clear();
    products.forEach((product) => {
      this.products.set(product.code, product);
    });
  }

  /**
   * Load global default price list
   */
  loadGlobalPriceList(priceList: PriceList): void {
    this.globalPriceList = priceList;
  }

  /**
   * Load organisation price list
   */
  loadOrgPriceList(orgId: string, priceList: PriceList): void {
    this.orgPriceLists.set(orgId, priceList);
  }

  /**
   * Load customer-specific price list
   */
  loadCustomerPriceList(customerId: string, priceList: PriceList): void {
    this.customerPriceLists.set(customerId, priceList);
  }

  /**
   * Resolve pricing for a BOM
   */
  async resolvePricing(
    bom: BOMLine[],
    context: PricingContext,
    taxRate: number = 0
  ): Promise<PricingResult> {
    const pricedBOM: PricedBOMLine[] = [];
    const missing_prices: string[] = [];

    // Determine which price list to use
    const priceList = this.selectPriceList(context);
    const priceListId = priceList?.id || "none";

    // Price each BOM line
    for (const line of bom) {
      try {
        const unitPrice = this.resolvePrice(line.product, priceList);

        if (unitPrice === null) {
          missing_prices.push(line.product);
          // Add to BOM with zero price (will block quote)
          pricedBOM.push({
            ...line,
            unit_price: 0,
            line_total: 0,
          });
        } else {
          const lineTotal = line.qty * unitPrice;
          pricedBOM.push({
            ...line,
            unit_price: unitPrice,
            line_total: lineTotal,
          });
        }
      } catch (error) {
        console.error(`Error pricing product ${line.product}:`, error);
        missing_prices.push(line.product);
        pricedBOM.push({
          ...line,
          unit_price: 0,
          line_total: 0,
        });
      }
    }

    // Calculate totals
    const totals = this.calculateTotals(pricedBOM, taxRate);

    return {
      bom: pricedBOM,
      totals,
      missing_prices,
      price_list_id: priceListId,
    };
  }

  /**
   * Select appropriate price list based on precedence
   * 1. Customer-specific price list (if date-valid)
   * 2. Organisation default price list
   * 3. Global default price list
   */
  private selectPriceList(context: PricingContext): PriceList | null {
    const { customer_id, org_id, currency, quote_date } = context;

    // 1. Try customer-specific price list
    if (customer_id) {
      const customerList = this.customerPriceLists.get(customer_id);
      if (customerList && this.isValidForDate(customerList, quote_date)) {
        return customerList;
      }
    }

    // 2. Try organisation default list
    if (org_id) {
      const orgList = this.orgPriceLists.get(org_id);
      if (orgList && this.isValidForDate(orgList, quote_date)) {
        return orgList;
      }
    }

    // 3. Fall back to global default list
    if (this.globalPriceList && this.isValidForDate(this.globalPriceList, quote_date)) {
      return this.globalPriceList;
    }

    return null;
  }

  /**
   * Check if price list is valid for the given date
   */
  private isValidForDate(priceList: PriceList, date: Date): boolean {
    if (priceList.valid_from > date) {
      return false;
    }

    if (priceList.valid_to && priceList.valid_to < date) {
      return false;
    }

    return true;
  }

  /**
   * Resolve unit price for a product code
   */
  private resolvePrice(productCode: string, priceList: PriceList | null): number | null {
    if (!priceList) {
      return null;
    }

    const entry = priceList.entries.find((e) => e.product_code === productCode);
    return entry ? entry.unit_price : null;
  }

  /**
   * Get product information
   */
  getProduct(productCode: string): Product | undefined {
    return this.products.get(productCode);
  }

  /**
   * Calculate quote totals
   */
  private calculateTotals(bom: PricedBOMLine[], taxRate: number): QuoteTotals {
    const subtotal = bom.reduce((sum, line) => sum + line.line_total, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      tax_rate: taxRate,
      total: Number(total.toFixed(2)),
    };
  }

  /**
   * Enrich BOM with product names and units from product catalog
   */
  enrichBOM(bom: BOMLine[]): BOMLine[] {
    return bom.map((line) => {
      const product = this.getProduct(line.product);
      return {
        ...line,
        name: product?.name || line.product,
        unit: product?.unit || line.unit,
      };
    });
  }
}

/**
 * Parse products from CSV data
 */
export function parseProductsCSV(csvData: string): Product[] {
  const lines = csvData.trim().split("\n");
  const products: Product[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [code, name, category, unit, active] = line.split(",");

    products.push({
      code: code.trim(),
      name: name.trim(),
      category: category?.trim() || "",
      unit: unit?.trim() || "each",
      active: active?.trim().toLowerCase() === "true",
    });
  }

  return products;
}

/**
 * Parse price list from CSV data
 * CSV format: code,currency,unit_price,valid_from,valid_to
 */
export function parsePriceListCSV(
  csvData: string,
  priceListId: string = "default",
  priceListName: string = "Default EUR Price List",
  currency: string = "EUR"
): PriceList {
  const lines = csvData.trim().split("\n");
  const entries: PriceListEntry[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");

    // CSV columns: code, currency, unit_price, valid_from, valid_to
    const code = parts[0];
    const unit_price = parts[2]; // unit_price is in column 3 (index 2)

    if (code && unit_price) {
      entries.push({
        product_code: code.trim(),
        unit_price: parseFloat(unit_price.trim()),
      });
    }
  }

  return {
    id: priceListId,
    name: priceListName,
    currency,
    valid_from: new Date("2025-11-10"),
    entries,
  };
}

/**
 * Factory function to create pricing resolver with loaded data
 */
export async function createPricingResolver(
  productsCSV: string,
  priceListCSV: string
): Promise<PricingResolver> {
  const resolver = new PricingResolver();

  // Load products
  const products = parseProductsCSV(productsCSV);
  resolver.loadProducts(products);

  // Load global price list
  const priceList = parsePriceListCSV(priceListCSV);
  resolver.loadGlobalPriceList(priceList);

  return resolver;
}
