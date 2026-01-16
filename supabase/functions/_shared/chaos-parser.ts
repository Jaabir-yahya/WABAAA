/**
 * NairobiChaosParser - Parses messy Swahili/English messages into structured data.
 */

export interface ParsedMessage {
  type: "order" | "payment" | "inquiry" | "status" | "unknown";
  confidence: number;
  data: any;
  raw_text: string;
  language_detected?: "sw" | "en" | "mixed";
}

export interface OrderItem {
  product: string;
  quantity: number;
  unit?: string;
  price_mentioned?: number;
}

export interface ParsedOrder {
  items: OrderItem[];
  total_mentioned?: number;
  delivery_address?: string;
  delivery_instructions?: string;
  urgent?: boolean;
}

export interface ParsedPayment {
  amount: number;
  method?: "mpesa" | "cash" | "bank";
  reference?: string;
  sender_phone?: string;
}

export class NairobiChaosParser {
  private businessConfig: any;

  constructor(businessConfig?: any) {
    this.businessConfig = businessConfig || {};
  }

  parse(text: string): ParsedMessage {
    const normalized = this.normalize(text);

    const paymentResult = this.parsePayment(normalized);
    if (paymentResult.confidence > 0.7) {
      return {
        type: "payment",
        confidence: paymentResult.confidence,
        data: paymentResult.data,
        raw_text: text,
        language_detected: this.detectLanguage(text),
      };
    }

    const orderResult = this.parseOrder(normalized);
    if (orderResult.confidence > 0.6) {
      return {
        type: "order",
        confidence: orderResult.confidence,
        data: orderResult.data,
        raw_text: text,
        language_detected: this.detectLanguage(text),
      };
    }

    const statusResult = this.parseStatusQuery(normalized);
    if (statusResult.confidence > 0.7) {
      return {
        type: "status",
        confidence: statusResult.confidence,
        data: statusResult.data,
        raw_text: text,
        language_detected: this.detectLanguage(text),
      };
    }

    return {
      type: "inquiry",
      confidence: 0.5,
      data: { message: text },
      raw_text: text,
      language_detected: this.detectLanguage(text),
    };
  }

  private normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  private detectLanguage(text: string): "sw" | "en" | "mixed" {
    const swahiliKeywords = [
      "nataka",
      "nina",
      "nipe",
      "tafadhali",
      "asante",
      "lipa",
      "pesa",
    ];
    const englishKeywords = [
      "want",
      "need",
      "give",
      "please",
      "thanks",
      "pay",
      "money",
    ];

    const textLower = text.toLowerCase();
    const hasSwahili = swahiliKeywords.some((kw) => textLower.includes(kw));
    const hasEnglish = englishKeywords.some((kw) => textLower.includes(kw));

    if (hasSwahili && hasEnglish) return "mixed";
    if (hasSwahili) return "sw";
    if (hasEnglish) return "en";
    return "mixed";
  }

  private parseOrder(text: string): { confidence: number; data: ParsedOrder } {
    const items: OrderItem[] = [];
    let confidence = 0;

    const orderPatterns = [
      /nataka|nina hitaji|nipe|order/i,
      /(\d+)\s*(kg|g|lita|litre|l|pcs|pieces|packet)/i,
    ];

    const hasIntent = orderPatterns[0].test(text);
    if (hasIntent) confidence += 0.3;

    const quantityMatches = text.matchAll(
      /(\d+\.?\d*)\s*(kg|g|lita|litre|l|pcs|pieces|packet|packets)?\s*([a-z]+)/gi,
    );

    for (const match of quantityMatches) {
      const quantity = parseFloat(match[1]);
      const unit = match[2] || "pcs";
      const product = match[3];

      if (product && product.length > 2) {
        items.push({
          product: this.normalizeProduct(product),
          quantity,
          unit: this.normalizeUnit(unit),
        });
        confidence += 0.3;
      }
    }

    const productKeywords = this.getProductKeywords();
    for (const keyword of productKeywords) {
      if (text.includes(keyword) && !items.find((item) => item.product === keyword)) {
        items.push({
          product: keyword,
          quantity: 1,
        });
        confidence += 0.2;
      }
    }

    const deliveryMatch = text.match(/(peleka|deliver|tuma)\s+(.+)/i);
    const delivery_address = deliveryMatch ? deliveryMatch[2] : undefined;
    const urgent = /haraka|urgent|sasa|asap/i.test(text);

    return {
      confidence: Math.min(confidence, 1.0),
      data: {
        items,
        delivery_address,
        urgent,
      },
    };
  }

  private parsePayment(text: string): { confidence: number; data: ParsedPayment } {
    let confidence = 0;
    let amount: number | undefined;
    let method: "mpesa" | "cash" | "bank" | undefined;
    let reference: string | undefined;

    const paymentKeywords = /lipa|kulipa|pay|paid|sent|mpesa|pesa/i;
    if (paymentKeywords.test(text)) {
      confidence += 0.4;
    }

    const amountPatterns = [
      /(\d+\.?\d*)\s*(shillings?|bob|ksh|kes)/i,
      /(ksh|kes)?\s*(\d+\.?\d*)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1] || match[2]);
        confidence += 0.3;
        break;
      }
    }

    if (/mpesa|m-pesa|m pesa/i.test(text)) {
      method = "mpesa";
      confidence += 0.2;
    } else if (/cash|pesa taslimu/i.test(text)) {
      method = "cash";
      confidence += 0.1;
    }

    const refMatch = text.match(/([A-Z0-9]{10})/);
    if (refMatch) {
      reference = refMatch[1];
      confidence += 0.2;
    }

    return {
      confidence,
      data: {
        amount: amount ?? 0,
        method,
        reference,
      },
    };
  }

  private parseStatusQuery(text: string): { confidence: number; data: any } {
    const statusKeywords = /iko wapi|where|status|progress|order|delivery/i;

    if (statusKeywords.test(text)) {
      return {
        confidence: 0.8,
        data: { query_type: "order_status" },
      };
    }

    return { confidence: 0, data: {} };
  }

  private normalizeProduct(product: string): string {
    const aliases = this.businessConfig.parser_rules?.product_aliases || {};

    for (const [canonical, aliasList] of Object.entries(aliases)) {
      if ((aliasList as string[]).includes(product)) {
        return canonical;
      }
    }

    return product;
  }

  private normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      lita: "lita",
      litre: "lita",
      l: "lita",
      kg: "kg",
      g: "g",
      pcs: "pcs",
      pieces: "pcs",
      packet: "packet",
      packets: "packet",
    };

    return unitMap[unit.toLowerCase()] || unit;
  }

  private getProductKeywords(): string[] {
    const aliases = this.businessConfig.parser_rules?.product_aliases || {};
    return Object.keys(aliases);
  }
}

export function createParser(businessConfig?: any): NairobiChaosParser {
  return new NairobiChaosParser(businessConfig);
}
