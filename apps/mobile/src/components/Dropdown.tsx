import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface DropdownProps {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  suffix?: string;
}

export function Dropdown({ label, value, options, onChange, suffix = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);

  const displayText = `${value}${suffix}`;

  return (
    <>
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
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.menuLabel}>{label}</Text>
            <ScrollView style={styles.optionsList}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.5)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
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
    letterSpacing: 0.5,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    opacity: 0.2,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
});
