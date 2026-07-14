const API_BASE_URL = process.env.MCP_API_BASE_URL ?? "http://127.0.0.1:8787";

export async function callGateway<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal, headers: { accept: "application/json", ...options.headers } });
    const body = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(body.error ?? `Gateway request failed with HTTP ${response.status}.`);
    return body;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw new Error("The Mermaid Studio gateway timed out after 70 seconds. Check the API and Mermaid CLI browser installation.");
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}
