import { apiRequest } from "./api";
import {
  clearStoredAuthSession,
  setStoredAuthSession,
  updateStoredAuthUser,
} from "./authSession";

async function readApiError(response: Response, fallback: string): Promise<string> {
  const raw = await response.text();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // Keep raw text when body is not JSON.
  }

  return raw;
}

export interface RegisterProfileData {
  email: string;
  password: string;
  username: string;
  name: string;
  profilePhoto?: string;
  userType?: number;
  latitud: number;
  longitud: number;
}

export interface UserPreferencesData {
  latitude: number;
  longitude: number;
  radioKm: number;
  extension: "SHORT" | "MEDIUM" | "LONG";
  genreIds: number[];
}

export interface UserPreferencesResponse {
  id: number;
  userId: string;
  radioKm: number;
  extension: "SHORT" | "MEDIUM" | "LONG";
  genreIds: number[];
  createdAt: string;
  updatedAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export const authService = {
  async signIn(email: string, password: string) {
    const response = await apiRequest("/Auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Credenciales inválidas"));
    }

    const data = await response.json();
    await setStoredAuthSession({
      accessToken: data.accessToken,
      user: {
        id: data.user.id,
        supabaseId: data.user.supabaseId,
        email: data.user.email,
        username: data.user.username,
        name: data.user.name,
        profilePhoto: data.user.profilePhoto,
      },
    });

    return data;
  },

  async registerBackendProfile(profileData: RegisterProfileData) {
    const response = await apiRequest("/Auth/register", {
      method: "POST",
      body: JSON.stringify({
        ...profileData,
        profilePhoto: profileData.profilePhoto || "",
        userType: profileData.userType || 2,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Error al registrar el perfil en el backend"));
    }

    const data = await response.json();
    await setStoredAuthSession({
      accessToken: data.accessToken,
      user: {
        id: data.user.id,
        supabaseId: data.user.supabaseId,
        email: data.user.email,
        username: data.user.username,
        name: data.user.name,
        profilePhoto: data.user.profilePhoto,
      },
    });

    return data.user;
  },

  async patchEmail(newEmail: string, currentPassword: string) {
    const normalizedEmail = newEmail.trim().toLowerCase();
    const normalizedPassword = currentPassword.trim();

    const response = await apiRequest("/Auth/email", {
      method: "PATCH",
      body: JSON.stringify({
        newEmail: normalizedEmail,
        currentPassword: normalizedPassword,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Error al actualizar el email"));
    }

    const payload = await response.json().catch(() => null);
    const user = payload?.user ?? payload ?? {};
    const syncedEmail = typeof user?.email === "string" ? user.email : normalizedEmail;

    try {
      await updateStoredAuthUser({
        email: syncedEmail,
        username: typeof user?.username === "string" ? user.username : undefined,
        name: typeof user?.name === "string" ? user.name : undefined,
        profilePhoto: typeof user?.profilePhoto === "string" ? user.profilePhoto : undefined,
      });
    } catch (error) {
      // No rompemos el flujo si falla sincronizar cache local.
      console.warn("[authService.patchEmail] updateStoredAuthUser failed", error);
    }

    return {
      ...user,
      email: syncedEmail,
    };
  },

  async patchPassword(currentPassword: string, newPassword: string) {
    const response = await apiRequest("/Auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Error al actualizar la contraseña"));
    }

    return response.json();
  },

  async signOut() {
    await clearStoredAuthSession();
  },

  async updatePreferences(userId: string, preferences: UserPreferencesData) {
    const response = await apiRequest(`/users/${userId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Error al guardar preferencias"));
    }

    return response;
  },

  async getPreferences(userId: string): Promise<UserPreferencesResponse | null> {
    const response = await apiRequest(`/users/${userId}/preferences`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await readApiError(response, "Error al obtener preferencias"));
    }

    return response.json();
  },

  async fetchGenres() {
    const response = await apiRequest("/genres");
    if (!response.ok) {
      // Fallback genres if API fails
      return [
        { id: 1, name: "Ficción" },
        { id: 2, name: "No ficción" },
        { id: 3, name: "Fantasía" },
        { id: 4, name: "Romance" },
        { id: 5, name: "Misterio" },
        { id: 6, name: "Ciencia ficción" },
        { id: 7, name: "Biografía" },
        { id: 8, name: "Historia" },
        { id: 9, name: "Autoayuda" },
        { id: 10, name: "Infantil" },
        { id: 11, name: "Juvenil" },
        { id: 12, name: "Terror" },
        { id: 13, name: "Poesía" },
        { id: 14, name: "Ensayo" },
      ];
    }
    return await response.json();
  },
};
