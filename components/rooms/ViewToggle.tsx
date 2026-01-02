import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ViewToggleProps {
  isGridView: boolean;
  onToggle: (isGrid: boolean) => void;
}

export default function ViewToggle({ isGridView, onToggle }: ViewToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isGridView && styles.buttonActive]}
        onPress={() => onToggle(false)}
      >
        <Text style={[styles.icon, !isGridView && styles.iconActive]}>
          ☰
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, isGridView && styles.buttonActive]}
        onPress={() => onToggle(true)}
      >
        <Text style={[styles.icon, isGridView && styles.iconActive]}>
          ⊞
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  button: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  buttonActive: {
    backgroundColor: '#1890ff',
  },
  icon: {
    fontSize: 18,
    color: '#666',
  },
  iconActive: {
    color: '#fff',
  },
});

