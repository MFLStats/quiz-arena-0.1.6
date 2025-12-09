import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch (networkError) {
    // Handle network errors (e.g., DNS resolution failed, offline)
    console.error(`[API] Network error for ${path}:`, networkError);
    throw new Error('Network error: Failed to connect to server');
  }
  let json: ApiResponse<T> | null = null;
  const text = await res.text();
  try {
    if (text) {
      json = JSON.parse(text) as ApiResponse<T>;
    }
  } catch (parseError) {
    // Failed to parse JSON (likely 500 HTML or empty body)
    console.error(`[API] JSON Parse Error for ${path}. Status: ${res.status}. Response: ${text.substring(0, 200)}...`);
    throw new Error(`API Error ${res.status}: ${res.statusText || 'Invalid Response'}`);
  }
  if (!res.ok) {
    // If we have a structured error from the API, use it
    if (json && json.error) {
      throw new Error(json.error);
    }
    // Otherwise fallback to status text
    throw new Error(`Request failed with status ${res.status}: ${res.statusText}`);
  }
  // Handle success case where data might be missing but success is true (rare but possible)
  if (json && !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  // Ensure data exists if success is true
  if (json && json.data === undefined) {
    // Some endpoints might return success: true without data, but our type definition expects T
    // If T is void/undefined, this is fine, but if T is an object, this might be an issue.
    // For now, we assume if the caller expects T, data should be there.
    // We'll return undefined casted as T if data is missing but success is true.
    return undefined as unknown as T;
  }
  return json!.data as T;
}