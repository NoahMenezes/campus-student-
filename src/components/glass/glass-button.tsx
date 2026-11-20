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
          borderRadius={0}
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
    container: { height: 30, paddingHorizontal: 12, borderRadius: 0 } as ViewStyle,
    text: { fontSize: 12, fontWeight: '600' } as TextStyle,
    radius: 0,
  },
  sm: {
    container: { height: 36, paddingHorizontal: 16, borderRadius: 0 } as ViewStyle,
    text: { fontSize: 13, fontWeight: '600' } as TextStyle,
    radius: 0,
  },
  default: {
    container: { height: 46, paddingHorizontal: 20, borderRadius: 0 } as ViewStyle,
    text: { fontSize: 15, fontWeight: '700' } as TextStyle,
    radius: 0,
  },
  lg: {
    container: { height: 52, paddingHorizontal: 24, borderRadius: 0 } as ViewStyle,
    text: { fontSize: 16, fontWeight: '700' } as TextStyle,
    radius: 0,
  },
  icon: {
    container: { width: 40, height: 40, paddingHorizontal: 0, borderRadius: 0 } as ViewStyle,
    text: { fontSize: 14 } as TextStyle,
    radius: 0,
  },
};

const VARIANTS: Record<GlassButtonVariant | 'active', ViewStyle> = {
  // Strong color primary button: high-impact vivid blue with sharp pointed corners
  default: {
    backgroundColor: '#0052FF',
    borderWidth: 1,
    borderColor: '#387BFF',
    borderRadius: 0,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 0,
  },
  tinted: {
    backgroundColor: 'rgba(0, 82, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.50)',
    borderRadius: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 0,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  active: {
    backgroundColor: '#0043D6',
    borderWidth: 1,
    borderColor: '#548DFF',
    borderRadius: 0,
  },
};

const VARIANT_TEXT: Record<GlassButtonVariant | 'active', TextStyle> = {
  default: { color: '#ffffff', letterSpacing: 0.3 },
  glass: { color: '#ffffff' },
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
    gap: 8,
    borderRadius: 0,
  },
  iconBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFill: {
    pointerEvents: 'none',
    borderRadius: 0,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    letterSpacing: 0.3,
  },
});
