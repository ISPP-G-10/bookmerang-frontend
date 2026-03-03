import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function Header() {
  const handleProfilePress = () => {
    // TODO: Navegar al perfil cuando esté implementado
    // router.push('/profile');
    router.push('/profile' as any);
  };

  return (
    <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center justify-between">
      {/* Foto de perfil */}
      <TouchableOpacity onPress={handleProfilePress}>
        <View className="w-10 h-10 rounded-full bg-[#e07a5f] items-center justify-center">
          <FontAwesome name="user" size={20} color="#fdfbf7" />
        </View>
      </TouchableOpacity>

      {/* Logo y nombre */}
      <View className="flex-row items-center">
        <View className="bg-[#e07a5f] rounded-lg w-9 h-9 items-center justify-center mr-2">
          <FontAwesome name="book" size={18} color="#fdfbf7" />
        </View>
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#e07a5f' }}>
          Bookmerang
        </Text>
      </View>

      {/* Espacio para mantener el centrado */}
      <View className="w-10" />
    </View>
  );
}
