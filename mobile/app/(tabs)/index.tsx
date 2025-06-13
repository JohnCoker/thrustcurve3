import { Platform, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, ActionSheetIOS, Alert, PlatformColor, SafeAreaView, SectionList, SectionListData, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useCallback } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface ListItemProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  onMotors: () => void;
  onDetails: () => void;
  type: 'rocket' | 'motor';
}

const ListItem = ({ name, onEdit, onDelete, onMotors, onDetails, type }: ListItemProps) => {
  const renderRightActions = (progress: any, dragX: any) => (
    <ThemedView style={styles.swipeActions}>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: PlatformColor('systemGreen') }]}
        onPress={onMotors}>
        <Ionicons 
          name="list"
          size={22} 
          color={PlatformColor('systemBackground')} 
          style={styles.actionIcon}
        />
        <ThemedText style={[styles.actionText, { color: PlatformColor('systemBackground') }]} numberOfLines={1}>
          {type === 'rocket' ? 'Motors' : 'Rockets'}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: PlatformColor('systemBlue') }]}
        onPress={onEdit}>
        <Ionicons 
          name="pencil" 
          size={22} 
          color={PlatformColor('systemBackground')} 
          style={styles.actionIcon}
        />
        <ThemedText style={[styles.actionText, { color: PlatformColor('systemBackground') }]}>Edit</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: PlatformColor('systemRed') }]}
        onPress={onDelete}>
        <Ionicons 
          name="trash" 
          size={22} 
          color={PlatformColor('systemBackground')} 
          style={styles.actionIcon}
        />
        <ThemedText style={[styles.actionText, { color: PlatformColor('systemBackground') }]}>Delete</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  if (Platform.OS === 'ios') {
    return (
      <ReanimatedSwipeable
        renderRightActions={renderRightActions}
        overshootRight={false}>
        <TouchableOpacity onPress={onDetails}>
          <ThemedView style={styles.listItem}>
            <ThemedText style={styles.listItemText}>{name}</ThemedText>
          </ThemedView>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    );
  }

  // Android layout
  return (
    <TouchableOpacity onPress={onDetails}>
      <ThemedView style={styles.listItem}>
        <ThemedText style={styles.listItemText}>{name}</ThemedText>
        <View style={styles.androidActions}>
          <TouchableOpacity 
            onPress={onMotors}
            style={styles.androidAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons 
              name="list" 
              size={22} 
              color="#2196F3" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onEdit}
            style={styles.androidAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons 
              name="pencil" 
              size={22} 
              color="#4CAF50" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onDelete}
            style={styles.androidAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons 
              name="trash" 
              size={22} 
              color="#F44336" 
            />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
};

interface ItemData {
  id: string;
  name: string;
  type: 'rocket' | 'motor';
}

interface SectionData {
  title: string;
  data: ItemData[];
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const sections: SectionData[] = [
    {
      title: 'ROCKETS',
      data: Array.from({ length: 20 }).map((_, i) => ({
        id: `rocket-${i}`,
        name: `Rocket ${i + 1}`,
        type: 'rocket'
      }))
    },
    {
      title: 'MOTORS',
      data: Array.from({ length: 20 }).map((_, i) => ({
        id: `motor-${i}`,
        name: `Motor ${i + 1}`,
        type: 'motor'
      }))
    }
  ];

  const handleEdit = (type: 'rocket' | 'motor', index: number) => {
    console.log(`Edit ${type} at index ${index}`);
  };

  const handleDelete = (type: 'rocket' | 'motor', index: number) => {
    console.log(`Delete ${type} at index ${index}`);
  };

  const handleMotors = (type: 'rocket' | 'motor', index: number) => {
    console.log(`Show ${type === 'rocket' ? 'compatible motors' : 'rockets using this motor'} for ${type} ${index}`);
  };

  const handleDetails = (type: 'rocket' | 'motor', index: number) => {
    console.log(`Show details for ${type} ${index}`);
  };

  const renderSectionHeader = useCallback(({ section: { title } }: { section: SectionData }) => (
    <View style={styles.sectionHeaderContainer}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  ), []);

  const renderItem = useCallback(({ item, index }: { item: ItemData; index: number }) => (
    <ListItem
      name={item.name}
      type={item.type}
      onEdit={() => handleEdit(item.type, index)}
      onDelete={() => handleDelete(item.type, index)}
      onMotors={() => handleMotors(item.type, index)}
      onDetails={() => handleDetails(item.type, index)}
    />
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.sectionsContainer, isLandscape ? styles.landscapeContainer : styles.portraitContainer]}>
          <View style={[styles.sectionContainer, isLandscape && styles.landscapeSection]}>
            <SectionList
              style={styles.list}
              sections={[sections[0]]}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={item => item.id}
              stickySectionHeadersEnabled={false}
            />
          </View>
          <View style={[styles.sectionContainer, isLandscape && styles.landscapeSection]}>
            <SectionList
              style={styles.list}
              sections={[sections[1]]}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={item => item.id}
              stickySectionHeadersEnabled={false}
            />
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sectionHeaderContainer: {
    backgroundColor: Platform.OS === 'ios' 
      ? PlatformColor('systemGroupedBackground')
      : PlatformColor('?android:colorBackgroundFloating'),
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 8, android: 12 }),
    marginTop: Platform.select({ ios: 16, android: 8 }),
    borderBottomWidth: Platform.OS === 'android' ? StyleSheet.hairlineWidth : 0,
    borderBottomColor: Platform.OS === 'android' ? PlatformColor('?android:colorControlHighlight') : undefined,
  },
  sectionTitle: {
    fontSize: Platform.select({ ios: 13, android: 16 }),
    fontFamily: Platform.select({
      ios: undefined,
      android: 'sans-serif-medium'
    }),
    fontWeight: Platform.select({ ios: '600', android: 'normal' }),
    textTransform: 'uppercase',
    letterSpacing: Platform.select({ ios: 0.8, android: 0.5 }),
    color: Platform.OS === 'ios'
      ? PlatformColor('secondaryLabel')
      : PlatformColor('?android:colorAccent'),
  },
  listItem: {
    padding: 16,
    backgroundColor: Platform.OS === 'ios'
      ? PlatformColor('secondarySystemGroupedBackground')
      : PlatformColor('?android:colorBackground'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Platform.select({ ios: 16, android: 0 }),
    borderRadius: Platform.select({ ios: 10, android: 0 }),
    marginVertical: Platform.select({ ios: 0.5, android: 0 }),
    ...Platform.select({
      android: {
        elevation: 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: PlatformColor('?android:textColorTertiary')
      }
    })
  },
  listItemText: {
    flex: 1,
    fontSize: Platform.select({ ios: 17, android: 16 }),
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif'
      }
    })
  },
  menuIcon: {
    padding: 8,
  },
  androidActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  androidAction: {
    padding: 6,
    marginLeft: 2,
  },
  swipeActions: {
    flexDirection: 'row',
    width: 240,
    height: '100%'
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionIcon: {
    marginBottom: 2
  },
  sectionsContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios'
      ? PlatformColor('systemGroupedBackground')
      : PlatformColor('?android:colorBackground'),
    paddingHorizontal: Platform.select({ ios: 0, android: 8 }),
  },
  portraitContainer: {
    flexDirection: 'column',
    gap: Platform.select({ ios: 0, android: 8 }),
  },
  landscapeContainer: {
    flexDirection: 'row',
    gap: Platform.select({ ios: 16, android: 8 }),
    paddingHorizontal: Platform.select({ ios: 16, android: 0 }),
  },
  sectionContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  landscapeSection: {
    marginHorizontal: 0,
  }
});

