import supabase from "../lib/supabase";

const genres = [
  "Ficción",
  "No ficción",
  "Fantasía",
  "Romance",
  "Misterio",
  "Ciencia ficción",
  "Biografía",
  "Historia",
  "Autoayuda",
  "Infantil",
  "Juvenil",
  "Terror",
  "Poesía",
  "Ensayo",
];

async function seedGenres() {
  try {
    console.log("Insertando géneros...");

    const { data, error } = await supabase
      .from("genres")
      .insert(genres.map((name) => ({ name })))
      .select();

    if (error) {
      console.error("Error al insertar:", error);
      return;
    }

    console.log(`✅ ${data?.length} géneros insertados:`, data);
  } catch (err) {
    console.error("Error:", err);
  }
}

seedGenres();
