import CryptoJS from 'crypto-js';

// En un entorno de producción, esta clave debería venir de variables de entorno (.env),
// o idealmente, usar un mecanismo de intercambio de claves (ej. Diffie-Hellman) para E2EE real.
// Para mitigar MITM a nivel de payload y cumplir con RGPD en este contexto, usamos una clave compartida.
const SECRET_KEY = process.env.EXPO_PUBLIC_CHAT_ENCRYPTION_KEY || 'b00km3rang_s3cr3t_k3y_2026_!@#';

/**
 * Encripta un mensaje de texto plano usando AES.
 *
 * `key` es opcional sólo para compatibilidad con chats sin clave por
 * conversación. Para chats que sí tienen `encryptionKey`, debe pasarse:
 * cifrar con `SECRET_KEY` cuando el servidor espera la clave del chat
 * produce mensajes que luego se muestran como cifrados (bug histórico).
 */
export function encryptMessage(text: string, key?: string): string {
  if (!text) return text;
  const targetKey = key || SECRET_KEY;
  return CryptoJS.AES.encrypt(text, targetKey).toString();
}

/**
 * Desencripta un mensaje encriptado con AES.
 *
 * Si la desencriptación falla (clave incorrecta, mensaje sin cifrar de antes
 * de habilitar el cifrado, datos corruptos...) se devuelve el texto original.
 * Para detectar fallos sin enmascararlos (p.ej. cuando llega un tick de
 * polling antes de que el chat esté cargado y la clave es errónea), usar
 * `tryDecryptMessage`.
 */
export function decryptMessage(cipherText: string, key?: string): string {
  const result = tryDecryptMessage(cipherText, key);
  return result.ok ? result.plaintext : cipherText;
}

export type DecryptResult =
  | { ok: true; plaintext: string }
  | { ok: false; reason: 'empty-input' | 'empty-output' | 'malformed' };

/**
 * Variante de `decryptMessage` que no enmascara los errores: devuelve un
 * resultado discriminado para que el llamante pueda decidir si mostrar el
 * texto, saltar el ciclo de polling o loggear el incidente. Necesario para
 * evitar que un descifrado fallido (clave incorrecta) acabe mostrando el
 * texto cifrado al usuario.
 */
export function tryDecryptMessage(
  cipherText: string,
  key?: string,
): DecryptResult {
  if (!cipherText) return { ok: false, reason: 'empty-input' };
  const targetKey = key || SECRET_KEY;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, targetKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      return { ok: false, reason: 'empty-output' };
    }
    return { ok: true, plaintext: decryptedText };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}
