const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5044";

export async function healthCheck() {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}
