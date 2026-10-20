import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DB_KEY_STORAGE_KEY = 'audioink_db_encryption_key_v1';

let inMemoryFallbackKey: string | null = null;

/**
 * Generate a cryptographically secure 32-byte hex encryption key
 */
export async function generateCryptographicKey(byteLength = 32): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retrieves the stored database encryption key from hardware-backed SecureStore,
 * generating and persisting a new 32-byte key if one doesn't exist.
 */
export async function getOrCreateDatabaseEncryptionKey(): Promise<string> {
  // Web fallback: use per-runtime in-memory random key
  if (Platform.OS === 'web') {
    if (!inMemoryFallbackKey) {
      inMemoryFallbackKey = await generateCryptographicKey(32);
    }
    return inMemoryFallbackKey;
  }

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      let key = await SecureStore.getItemAsync(DB_KEY_STORAGE_KEY);
      if (!key) {
        key = await generateCryptographicKey(32);
        await SecureStore.setItemAsync(DB_KEY_STORAGE_KEY, key, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
      return key;
    }
  } catch (error) {
    console.warn('[SecureStore] Failed to access SecureStore, using ephemeral secure key:', error);
  }

  if (!inMemoryFallbackKey) {
    inMemoryFallbackKey = await generateCryptographicKey(32);
  }
  return inMemoryFallbackKey;
}
