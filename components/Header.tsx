import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  showBack?: boolean;
}

export default function Header({ showBack = false }: HeaderProps) {
  const insets = useSafeAreaInsets();

  const handleLeftPress = () => {
    if (showBack) {
      router.back();
    } else {
      router.push("/profile");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Izquierda: flecha atrás o foto de perfil */}
      <TouchableOpacity onPress={handleLeftPress}>
        <View style={styles.profileButton}>
          <FontAwesome
            name={showBack ? "arrow-left" : "user"}
            size={20}
            color="#fdfbf7"
          />
        </View>
      </TouchableOpacity>

      {/* Logo y nombre */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <FontAwesome name="book" size={18} color="#fdfbf7" />
        </View>
        <Text style={styles.logoText}>
          Bookmerang
        </Text>
      </View>

      {/* Espacio para mantener el centrado */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e07a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    backgroundColor: '#e07a5f',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#e07a5f',
  },
  spacer: {
    width: 40,
  },
});
