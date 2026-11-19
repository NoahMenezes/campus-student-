import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextProps, type ViewProps, type ViewStyle } from 'react-native';

import { GlassView, type GlassIntensity, type GlassVariant } from './glass-view';

export interface GlassCardProps extends ViewProps {
  intensity?: GlassIntensity;
  variant?: GlassVariant;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GlassCard({
  intensity = 'default',
  variant = 'material',
  borderRadius = 20,
  style,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <GlassView
      intensity={intensity}
      variant={variant}
      borderRadius={borderRadius}
      style={[styles.card, style]}
      {...rest}
    >
      {children}
    </GlassView>
  );
}

export function GlassCardHeader({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.header, style]} {...rest}>
      {children}
    </View>
  );
}

export interface GlassCardTitleProps extends TextProps {
  children?: React.ReactNode;
}

export function GlassCardTitle({ style, children, ...rest }: GlassCardTitleProps) {
  return (
    <Text style={[styles.title, style]} {...rest}>
      {children}
    </Text>
  );
}

export function GlassCardDescription({ style, children, ...rest }: TextProps) {
  return (
    <Text style={[styles.description, style]} {...rest}>
      {children}
    </Text>
  );
}

export function GlassCardContent({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.content, style]} {...rest}>
      {children}
    </View>
  );
}

export function GlassCardFooter({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.footer, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 18,
  },
  content: {
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
