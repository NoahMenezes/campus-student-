import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { GlassView } from './glass-view';

export type GlassButtonVariant = 'default' | 'glass' | 'tinted' | 'outline' | 'ghost';
export type GlassButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon';

export interface GlassButtonProps extends Omit<PressableProps, 'style'> {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
}

export function GlassButton({
  variant = 'glass',
  size = 'default',
  active = false,
  style,
  textStyle,
  children,
  onPress,
  disabled,
  ...rest
}: GlassButtonProps) {
  const isIcon = size === 'icon';

  const sizeStyle = SIZES[size];
  const variantContainerStyle = active ? VARIANTS.active : VARIANTS[variant];
  const variantTextStyle = active ? VARIANT_TEXT.active : VARIANT_TEXT[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        variantContainerStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        isIcon && styles.iconBase,
        style,
      ]}
      {...rest}
    >
      {variant === 'glass' && !active ? (
        <GlassView
          intensity="subtle"
          borderRadius={sizeStyle.radius}
          style={[StyleSheet.absoluteFill, styles.glassFill]}
        />
      ) : null}

      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, sizeStyle.text, variantTextStyle, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const SIZES = {
  xs: {
    container: { height: 28, paddingHorizontal: 10, borderRadius: 14 } as ViewStyle,
    text: { fontSize: 11, fontWeight: '500' } as TextStyle,
    radius: 14,
  },
  sm: {
    container: { height: 34, paddingHorizontal: 14, borderRadius: 17 } as ViewStyle,
    text: { fontSize: 13, fontWeight: '500' } as TextStyle,
    radius: 17,
  },
  default: {
    container: { height: 42, paddingHorizontal: 18, borderRadius: 21 } as ViewStyle,
    text: { fontSize: 14, fontWeight: '600' } as TextStyle,
    radius: 21,
  },
  lg: {
    container: { height: 50, paddingHorizontal: 24, borderRadius: 25 } as ViewStyle,
    text: { fontSize: 16, fontWeight: '600' } as TextStyle,
    radius: 25,
  },
  icon: {
    container: { width: 38, height: 38, paddingHorizontal: 0, borderRadius: 19 } as ViewStyle,
    text: { fontSize: 14 } as TextStyle,
    radius: 19,
  },
};

const VARIANTS: Record<GlassButtonVariant | 'active', ViewStyle> = {
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },
  default: {
    backgroundColor: '#3b82f6',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tinted: {
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.40)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  active: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.50)',
  },
};

const VARIANT_TEXT: Record<GlassButtonVariant | 'active', TextStyle> = {
  glass: { color: '#ffffff' },
  default: { color: '#ffffff' },
  tinted: { color: '#93c5fd' },
  outline: { color: '#e2e8f0' },
  ghost: { color: '#cbd5e1' },
  active: { color: '#ffffff', fontWeight: '700' },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  iconBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFill: {
    pointerEvents: 'none',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    letterSpacing: 0.2,
  },
});
