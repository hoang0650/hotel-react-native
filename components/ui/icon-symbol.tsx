// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'calendar': 'calendar-today',
  'wrench.and.screwdriver.fill': 'build',
  'person.2.fill': 'people',
  'person.fill': 'person',
  'gearshape.fill': 'settings',
  'chart.bar.fill': 'bar-chart',
  'square.grid.2x2.fill': 'grid-view',
  'dollarsign.circle.fill': 'attach-money',
  'pencil': 'edit',
  'trash': 'delete',
  'plus.circle.fill': 'add-circle',
  'plus': 'add',
  'xmark': 'close',
  'file-pdf': 'picture-as-pdf',
  'doc.text.fill': 'description',
  'tag': 'local-offer',
  'receipt.fill': 'receipt',
  'creditcard.fill': 'credit-card',
  'magnifyingglass': 'search',
  'arrow.clockwise': 'refresh',
  'square.and.arrow.up': 'file-upload',
  'bell.fill': 'notifications',
  'bell': 'notifications-outline',
  'check-circle': 'check-circle',
  'sync': 'sync',
  'build': 'build',
  'info': 'info',
  'warning': 'warning',
  'bolt.fill': 'bolt',
  'bolt': 'bolt',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
