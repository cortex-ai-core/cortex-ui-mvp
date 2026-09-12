"use client";

import { useEffect, useRef, useState } from "react";
import { getUserPreferences, saveUserPreferences, type PersonaLength } from "./settingsApi";

type PreferenceState = {
  userId: string;
  length: PersonaLength | null;
  loaded: boolean;
  error: string | null;
  saved: boolean;
};

/** The user's own answer length (null = the persona decides), loaded and saved through the preferences route. */
export function useUserPreferences(userId: string) {
  const [state, setState] = useState<PreferenceState>({
    userId: "",
    length: null,
    loaded: false,
    error: null,
    saved: false,
  });
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    if (!userId) return;
    getUserPreferences()
      .then(({ preferences }) => {
        if (generation.current !== requestGeneration) return;
        setState({
          userId,
          length: preferences.response_length ?? null,
          loaded: true,
          error: null,
          saved: false,
        });
      })
      .catch((reason: unknown) => {
        if (generation.current !== requestGeneration) return;
        setState({
          userId,
          length: null,
          loaded: false,
          error:
            reason instanceof Error
              ? reason.message
              : "Unable to load preferences.",
          saved: false,
        });
      });
    return () => {
      generation.current = requestGeneration + 1;
    };
  }, [userId, revision]);

  const current = state.userId === userId;
  const loaded = current && state.loaded;

  async function save(length: PersonaLength | null) {
    if (!loaded || savingRef.current) return;
    const requestGeneration = generation.current;
    savingRef.current = true;
    setSaving(true);
    setState((previous) => ({ ...previous, error: null, saved: false }));
    try {
      const { preferences } = await saveUserPreferences(length);
      if (generation.current !== requestGeneration) return;
      setState({
        userId,
        length: preferences.response_length ?? null,
        loaded: true,
        error: null,
        saved: true,
      });
    } catch (reason) {
      if (generation.current !== requestGeneration) return;
      setState((previous) => ({
        ...previous,
        error:
          reason instanceof Error
            ? reason.message
            : "Unable to save preferences.",
        saved: false,
      }));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function reload() {
    if (savingRef.current) return;
    setState((previous) => ({
      ...previous,
      loaded: false,
      error: null,
      saved: false,
    }));
    setRevision((previous) => previous + 1);
  }

  return {
    length: current ? state.length : null,
    loading: !loaded && !(current && state.error),
    loaded,
    saving,
    error: current ? state.error : null,
    saved: current && state.saved,
    save,
    reload,
  };
}
