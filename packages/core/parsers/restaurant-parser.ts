import { NairobiChaosParser } from "../chaos-parser/index.ts";
import type { ParsedMessage } from "../chaos-parser/index.ts";

type Modifier = {
  type: "add" | "remove" | "substitute";
  value: string;
};

type RestaurantOrderData = {
  items: Array<{
    product: string;
    quantity: number;
    unit?: string;
  }>;
  modifiers: Modifier[];
  requested_time?: string;
  prep_time_minutes?: number;
};

export class RestaurantParser extends NairobiChaosParser {
  override parse(text: string): ParsedMessage {
    const base = super.parse(text);

    if (base.type !== "order") {
      return base;
    }

    const modifiers = this.parseModifiers(text);
    const requested_time = this.parseRequestedTime(text);
    const prep_time_minutes = this.parsePrepTime(text);

    return {
      ...base,
      data: {
        ...(base.data ?? {}),
        modifiers,
        requested_time,
        prep_time_minutes,
      } as RestaurantOrderData,
    };
  }

  private parseModifiers(text: string): Modifier[] {
    const normalized = text.toLowerCase();
    const modifiers: Modifier[] = [];

    const addPatterns = [
      /(extra|ongeza|zaidi ya)\s+([a-z\s]+)/gi,
    ];
    const removePatterns = [
      /(bila|hapana|no)\s+([a-z\s]+)/gi,
    ];
    const substitutePatterns = [
      /(badilisha|substitute|weka)\s+([a-z\s]+)\s+(badala ya)\s+([a-z\s]+)/gi,
    ];

    for (const pattern of addPatterns) {
      const matches = normalized.matchAll(pattern);
      for (const match of matches) {
        const value = match[2]?.trim();
        if (value) modifiers.push({ type: "add", value });
      }
    }

    for (const pattern of removePatterns) {
      const matches = normalized.matchAll(pattern);
      for (const match of matches) {
        const value = match[2]?.trim();
        if (value) modifiers.push({ type: "remove", value });
      }
    }

    for (const pattern of substitutePatterns) {
      const matches = normalized.matchAll(pattern);
      for (const match of matches) {
        const value = `${match[2]?.trim()} badala ya ${match[4]?.trim()}`;
        if (value) modifiers.push({ type: "substitute", value });
      }
    }

    return modifiers;
  }

  private parseRequestedTime(text: string): string | undefined {
    const normalized = text.toLowerCase();
    const match = normalized.match(/(saa|time)\s*(\d{1,2})(:\d{2})?/i);
    if (match) {
      return `saa ${match[2]}${match[3] ?? ""}`.trim();
    }
    if (/(haraka|sasa|asap|now)/i.test(normalized)) {
      return "haraka";
    }
    if (/(baadaye|later)/i.test(normalized)) {
      return "baadaye";
    }
    return undefined;
  }

  private parsePrepTime(text: string): number | undefined {
    const match = text.match(/(\d+)\s*(dakika|mins|minutes)/i);
    if (!match) return undefined;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : undefined;
  }
}
