import { FlatList, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const withBottomInset = (style, inset, spacing) => {
  const existingPadding = StyleSheet.flatten(style)?.paddingBottom || 0;
  return [style, { paddingBottom: Math.max(existingPadding, inset + spacing) }];
};

export function SafeAreaScrollView({ contentContainerStyle, bottomSpacing = 16, ...props }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...props}
      contentContainerStyle={withBottomInset(contentContainerStyle, insets.bottom, bottomSpacing)}
    />
  );
}

export function SafeAreaFlatList({ contentContainerStyle, bottomSpacing = 16, ...props }) {
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      {...props}
      contentContainerStyle={withBottomInset(contentContainerStyle, insets.bottom, bottomSpacing)}
    />
  );
}

export function useBottomSafeArea(spacing = 16) {
  const insets = useSafeAreaInsets();
  return insets.bottom + spacing;
}
