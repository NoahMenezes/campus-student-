import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { GlassView } from './glass-view';

export interface GlassButtonGroupProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'glass' | 'subtle' | 'plain';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GlassButtonGroup({
  orientation = 'horizontal',
  variant = 'glass',
  style,
  children,
  ...rest
}: GlassButtonGroupProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <GlassView
      intensity={variant === 'subtle' ? 'subtle' : 'default'}
      borderRadius={24}
      style={[
        styles.container,
        isHorizontal ? styles.horizontal : styles.vertical,
        style,
      ]}
      {...rest}
    >
      <View style={[styles.inner, isHorizontal ? styles.horizontal : styles.vertical]}>
        {children}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    alignSelf: 'center',
  },
  inner: {
    gap: 4,
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column',
  },
});
