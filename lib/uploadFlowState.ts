import AsyncStorage from "@react-native-async-storage/async-storage";

const RESET_UPLOAD_FLOW_KEY = "book_upload_flow_reset_needed";

export async function markUploadFlowResetNeeded(): Promise<void> {
  try {
    await AsyncStorage.setItem(RESET_UPLOAD_FLOW_KEY, "1");
  } catch {
    // No bloqueamos el flujo de usuario por errores de persistencia.
  }
}

export async function consumeUploadFlowResetFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(RESET_UPLOAD_FLOW_KEY);
    if (value !== "1") return false;
    await AsyncStorage.removeItem(RESET_UPLOAD_FLOW_KEY);
    return true;
  } catch {
    return false;
  }
}

