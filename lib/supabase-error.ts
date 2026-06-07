"use client";

type SupabaseLikeError = {
  error_description?: string;
  message?: string;
};

export function alertSupabaseError(error: unknown) {
  const supabaseError = error as SupabaseLikeError;

  console.error("Erreur Supabase complète:", error);
  alert(
    "Erreur Supabase : " +
      (supabaseError.message || supabaseError.error_description || JSON.stringify(error))
  );
}
