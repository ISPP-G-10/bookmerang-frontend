import { apiRequest } from "./api";
import { updateStoredAuthUser } from "./authSession";

export interface BookdropProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  profilePhoto: string;
  nombreEstablecimiento: string;
  addressText: string;
  latitud: number;
  longitud: number;
  bookspotStatus: string | number;
  createdAt: string;
}

export interface UpdateBookdropProfileInput {
  nombreEstablecimiento?: string;
  addressText?: string;
  profilePhoto?: string;
  latitud?: number;
  longitud?: number;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const raw = await response.text();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // Keep raw text if not JSON.
  }

  return raw;
}

export async function getBookdropProfile(): Promise<BookdropProfile> {
  const response = await apiRequest("/Bookdrop/perfil");

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo cargar el perfil del bookdrop"));
  }

  return response.json();
}

export async function updateBookdropProfile(
  input: UpdateBookdropProfileInput,
): Promise<BookdropProfile> {
  const response = await apiRequest("/Bookdrop/perfil", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo actualizar el perfil del bookdrop"));
  }

  const profile = (await response.json()) as BookdropProfile;

  await updateStoredAuthUser({
    email: profile.email,
    username: profile.username,
    name: profile.name,
    profilePhoto: profile.profilePhoto,
  });

  return profile;
}

export async function deleteBookdropProfile(): Promise<{ message: string | null }> {
  const response = await apiRequest("/Bookdrop/perfil", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "No se pudo eliminar el perfil del bookdrop"));
  }

  if (response.status === 204) {
    return { message: null };
  }

  const raw = await response.text();
  if (!raw) {
    return { message: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      message:
        typeof parsed?.message === "string"
          ? parsed.message
          : typeof parsed?.error === "string"
            ? parsed.error
            : raw,
    };
  } catch {
    return { message: raw };
  }
}
