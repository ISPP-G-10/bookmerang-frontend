import { apiRequest } from "./api";
import supabase from "./supabase";

export interface RegisterProfileData {
  username: string;
  name: string;
  profilePhoto?: string;
  userType?: number;
  latitud: number;
  longitud: number;
}

export interface UserPreferencesData {
  latitud: number;
  longitud: number;
  radioKm: number;
  extension: "SHORT" | "MEDIUM" | "LONG";
  genreIds: number[];
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Verificar si el usuario existe en el backend
    try {
      const response = await apiRequest("/Auth/me");
      if (!response.ok) {
        await supabase.auth.signOut();
        throw new Error("La cuenta ha sido eliminada o no existe en nuestros registros.");
      }
    } catch (e: any) {
      if (e.message !== "La cuenta ha sido eliminada o no existe en nuestros registros.") {
        await supabase.auth.signOut();
        throw new Error("No se pudo verificar la cuenta. Inténtalo de nuevo.");
      }
      throw e;
    }

    return data;
  },

  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });
    if (error) throw error;
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
      const errorText = await response.text();
      throw new Error(errorText || "Error al registrar el perfil en el backend");
    }

    return await response.json();
  },

  async updatePreferences(userId: string, preferences: UserPreferencesData) {
    const response = await apiRequest(`/users/${userId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Error al guardar preferencias");
    }

    return response;
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
