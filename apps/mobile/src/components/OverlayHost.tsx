import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

// A simple "overlay host" so child components (Dropdown, menus, etc.) can
// render fullscreen overlays bounded by the MobileFrame instead of escaping
// to the browser body via React Native's Modal (which portals to <body> on
// web). Each overlay is keyed; calling present() returns a dismiss handle.

type OverlayEntry = { id: number; node: React.ReactNode };

interface OverlayApi {
  present: (node: React.ReactNode) => () => void;
}

const OverlayContext = createContext<OverlayApi | null>(null);

export function useOverlay(): OverlayApi {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    // Safe fallback if a component is used outside the host (e.g. in tests).
    return { present: () => () => {} };
  }
  return ctx;
}

export function OverlayHost({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<OverlayEntry[]>([]);
  const nextId = useRef(1);

  const present = useCallback((node: React.ReactNode) => {
    const id = nextId.current++;
    setEntries((prev) => [...prev, { id, node }]);
    return () => setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const api = useMemo<OverlayApi>(() => ({ present }), [present]);

  return (
    <OverlayContext.Provider value={api}>
      <View style={styles.host}>
        {children}
        {entries.map((e) => (
          <View key={e.id} style={styles.layer} pointerEvents="box-none">
            {e.node}
          </View>
        ))}
      </View>
    </OverlayContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
