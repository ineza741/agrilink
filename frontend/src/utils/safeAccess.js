import { useState, useEffect } from "react";

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function safeString(value, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function firstOrNull(array) {
  return Array.isArray(array) && array.length > 0 ? array[0] : null;
}

export function firstOrDefault(array, defaultValue) {
  return Array.isArray(array) && array.length > 0 ? array[0] : defaultValue;
}

export function getIn(obj, path, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback;
  const keys = Array.isArray(path) ? path : path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return fallback;
    current = current[key];
  }
  return current ?? fallback;
}

export function useWithTimeout(fetchFn, timeoutMs = 5000) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
    timedOut: false,
  });

  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(() => {
      if (active) {
        setState((prev) => ({ ...prev, timedOut: true }));
      }
    }, timeoutMs);

    Promise.resolve(fetchFn())
      .then((data) => {
        if (active) {
          clearTimeout(timeoutId);
          setState({ loading: false, error: null, data, timedOut: false });
        }
      })
      .catch((error) => {
        if (active) {
          clearTimeout(timeoutId);
          setState({ loading: false, error, data: null, timedOut: false });
        }
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [fetchFn, timeoutMs]);

  return state;
}

export function useFakeDelay(ms = 300) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return ready;
}
