"use client";

import { useEffect, useRef, useState } from "react";
import type { ToneMode } from "./chatStore";
import { getUserPreferences, saveUserPreferences } from "./settingsApi";

type PreferenceState = {
  userId: string;
  tone: ToneMode;
  loaded: boolean;
  error: string | null;
  saved: boolean;
};

export function useUserPreferences(userId: string) {
  const [state, setState] = useState<PreferenceState>({
    userId: "",
    tone: "neutral",
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
          tone: preferences.response_style,
          loaded: true,
          error: null,
          saved: false,
        });
      })
      .catch((reason: unknown) => {
        if (generation.current !== requestGeneration) return;
        setState({
          userId,
          tone: "neutral",
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

  async function save(tone: ToneMode) {
    if (!loaded || savingRef.current) return;
    const requestGeneration = generation.current;
    savingRef.current = true;
    setSaving(true);
    setState((previous) => ({ ...previous, error: null, saved: false }));
    try {
      const { preferences } = await saveUserPreferences(tone);
      if (generation.current !== requestGeneration) return;
      setState({
        userId,
        tone: preferences.response_style,
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
    toneMode: current ? state.tone : ("neutral" as ToneMode),
    loading: !loaded && !(current && state.error),
    loaded,
    saving,
    error: current ? state.error : null,
    saved: current && state.saved,
    save,
    reload,
  };
}

