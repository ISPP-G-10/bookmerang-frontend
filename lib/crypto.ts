import CryptoJS from 'crypto-js';

// En un entorno de producción, esta clave debería venir de variables de entorno (.env),
// o idealmente, usar un mecanismo de intercambio de claves (ej. Diffie-Hellman) para E2EE real.
// Para mitigar MITM a nivel de payload y cumplir con RGPD en este contexto, usamos una clave compartida.
const SECRET_KEY = process.env.EXPO_PUBLIC_CHAT_ENCRYPTION_KEY || 'b00km3rang_s3cr3t_k3y_2026_!@#';

/**
 * Encripta un mensaje de texto plano usando AES.
 */
export function encryptMessage(text: string, key?: string): string {
  if (!text) return text;
  const targetKey = key || SECRET_KEY;
  return CryptoJS.AES.encrypt(text, targetKey).toString();
}

/**
 * Desencripta un mensaje encriptado con AES.
 * Si el mensaje no está encriptado (mensajes antiguos), lo devuelve tal cual.
 */
export function decryptMessage(cipherText: string, key?: string): string {
  if (!cipherText) return cipherText;
  const targetKey = key || SECRET_KEY;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, targetKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    // Si la desencriptación fue exitosa pero el resultado es vacío y el texto original no lo era,
    // o hubo un fallo silencioso de formato, retornamos el texto original.
    return decryptedText || cipherText;
  } catch (error) {
    // Si falla (ej. formato no válido de CryptoJS), asumimos que el mensaje original no estaba encriptado.
    return cipherText;
  }
}
