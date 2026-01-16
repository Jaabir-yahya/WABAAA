import { HttpError } from "./errors.ts";
import { getSupabaseClient } from "./db.ts";

export async function parseJson<T>(req: Request): Promise<T> {
  if (!req.headers.get("Content-Type")?.includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  try {
    return (await req.json()) as T;
  } catch (_error) {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export async function ensureBusinessActive(businessId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("id,status")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Failed to verify business", {
      message: error.message,
    });
  }

  if (!data) {
    throw new HttpError(404, "Business not found");
  }

  if (data.status !== "active") {
    throw new HttpError(403, "Business is not active");
  }
}
