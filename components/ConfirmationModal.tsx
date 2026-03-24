import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from '@/components/Themed';
import { Modal } from 'react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmColor?: 'primary' | 'danger';
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmColor = 'primary',
}: ConfirmModalProps) {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.secondaryText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                confirmColor === 'danger' && styles.primaryDanger,
                pressed && styles.buttonPressed,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.primaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    elevation: 99,
  },
  card: {
    width: '90%',          // antes '50%'
    maxWidth: 360,         // para tablets/escritorio
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: '#F3F4F8',
  },
  secondaryText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e4715f',
  },
  primaryDanger: {
    backgroundColor: '#DC2626',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
