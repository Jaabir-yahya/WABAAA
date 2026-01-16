import { NairobiChaosParser } from "../chaos-parser/index.ts";
import { RestaurantParser } from "./restaurant-parser.ts";

type ParserClass = typeof NairobiChaosParser;

const PARSER_REGISTRY: Record<string, ParserClass> = {
  mini_supermarket: NairobiChaosParser,
  restaurant: RestaurantParser,
};

export function getParserForBusiness(businessType: string): ParserClass {
  return PARSER_REGISTRY[businessType] ?? NairobiChaosParser;
}
