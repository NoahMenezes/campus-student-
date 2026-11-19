import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface GlassInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  editable?: boolean;
}

export function GlassInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  style,
  leftIcon,
  rightIcon,
  onRightIconPress,
  editable = true,
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        focused && styles.containerFocused,
        !editable && styles.containerDisabled,
        style,
      ]}
    >
      <BlurView
        intensity={40}
        tint="dark"
        style={[StyleSheet.absoluteFill, styles.blur]}
      />
      {/* Specular top highlight */}
      <View style={styles.highlight} />

      <View style={styles.row}>
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, rightIcon ? styles.inputWithRight : null]}
          selectionColor="rgba(56,189,248,0.8)"
          cursorColor="#38bdf8"
        />

        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconWrapper}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  containerFocused: {
    borderColor: 'rgba(56,189,248,0.45)',
    borderTopColor: 'rgba(56,189,248,0.6)',
    backgroundColor: 'rgba(56,189,248,0.07)',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.25,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  blur: {
    borderRadius: 16,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  leftIconWrapper: {
    marginRight: 10,
    opacity: 0.75,
  },
  rightIconWrapper: {
    marginLeft: 10,
    opacity: 0.75,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '400',
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    // Prevent default web outline — cast needed because RN types don't expose outlineWidth
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as object) : {}),
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  inputWithRight: {
    paddingRight: 0,
  },
});
