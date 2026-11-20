import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

export type GlassIntensity = 'subtle' | 'default' | 'strong';
export type GlassVariant = 'material' | 'liquid' | 'clear';

export interface GlassViewProps extends ViewProps {
  intensity?: GlassIntensity;
  variant?: GlassVariant;
  borderRadius?: number;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const INTENSITY_VALUES: Record<GlassIntensity, number> = {
  subtle: 20,
  default: 35,
  strong: 55,
};

const BACKGROUND_COLORS: Record<GlassIntensity, string> = {
  subtle: 'rgba(15, 23, 42, 0.40)',
  default: 'rgba(10, 14, 24, 0.70)',
  strong: 'rgba(8, 12, 20, 0.85)',
};

export function GlassView({
  intensity = 'default',
  variant = 'material',
  borderRadius = 0,
  borderWidth = 1,
  style,
  children,
  ...rest
}: GlassViewProps) {
  const blurAmount = INTENSITY_VALUES[intensity];
  const backgroundColor = BACKGROUND_COLORS[intensity];

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          borderWidth,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderTopColor: 'rgba(255, 255, 255, 0.22)',
          backgroundColor,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={blurAmount}
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <View
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
      />
      <View style={[styles.content, { borderRadius }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  content: {
    zIndex: 1,
  },
});
