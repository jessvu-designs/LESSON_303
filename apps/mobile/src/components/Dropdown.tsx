import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { useOverlay } from './OverlayHost';

interface DropdownProps {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  suffix?: string;
}

export function Dropdown({ label, value, options, onChange, suffix = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const overlay = useOverlay();
  const dismissRef = useRef<(() => void) | null>(null);

  const displayText = `${value}${suffix}`;

  // Mount/unmount the overlay via the host so it appears at the top of the
  // phone frame instead of being clipped to this Dropdown's parent layout.
  useEffect(() => {
    if (!open) return;
    dismissRef.current = overlay.present(
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.menu}>
          <Text style={styles.menuLabel}>{label}</Text>
          <ScrollView
            style={styles.optionsList}
            contentContainerStyle={styles.optionsListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  opt === value && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    opt === value && styles.optionTextSelected,
                  ]}
                >
                  {opt}{suffix}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>,
    );
    return () => {
      dismissRef.current?.();
      dismissRef.current = null;
    };
  }, [open, overlay, label, options, value, suffix, onChange]);

  return (
    <Pressable
      onPress={() => setOpen(true)}
      style={styles.trigger}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${displayText}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayText}</Text>
      </View>
      <Text style={styles.chevron}>v</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: '700',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  chevron: {
    fontSize: 20,
    color: colors.warning,
    fontWeight: '700',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.72)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    maxHeight: '60%',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionsList: {
    maxHeight: 300,
    alignSelf: 'stretch',
  },
  optionsListContent: {
    paddingBottom: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: 'rgba(244,197,66,0.22)',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.text,
  },
});
