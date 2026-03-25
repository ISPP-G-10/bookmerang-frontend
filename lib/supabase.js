import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        }
    }
)

export default supabase