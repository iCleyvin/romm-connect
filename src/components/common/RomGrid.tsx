// by Cleyvin

import React, { ReactElement, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { useGridLayout } from '../../hooks/useGridLayout';
import { Rom, RootStackParamList } from '../../types';
import { spacing } from '../../theme';
import RomCard from '../cards/RomCard';

const PADDING = spacing.md;
const GAP = spacing.sm;

interface Props {
  roms: Rom[];
  header?: ReactElement | null;
  empty?: ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
}

/** Responsive cover grid; tapping a cover opens the ROM. */
const RomGrid = ({ roms, header, empty, refreshing = false, onRefresh, onEndReached, loadingMore }: Props) => {
  const { colors } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { columns, itemWidth } = useGridLayout(104, PADDING, GAP, 3);

  const openRom = useCallback((rom: Rom) => navigation.navigate('RomDetail', { romId: rom.id }), [navigation]);

  return (
    <FlatList
      // FlatList cannot change numColumns in place; remount when rotation changes it.
      key={columns}
      data={roms}
      keyExtractor={(item) => String(item.id)}
      numColumns={columns}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      renderItem={({ item }) => <RomCard rom={item} width={itemWidth} onPress={openRom} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      initialNumToRender={12}
      windowSize={7}
    />
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: PADDING, paddingBottom: spacing.lg, flexGrow: 1 },
  row: { gap: GAP, marginBottom: spacing.sm },
  footer: { paddingVertical: 20, alignItems: 'center' },
});

export default RomGrid;
