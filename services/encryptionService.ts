import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

class EncryptionService {
  private encryptionKey: string | null = null;

  // Generate or retrieve encryption key
  async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Try to get existing key
    let key = await SecureStore.getItemAsync('encryption_key');
    
    if (!key) {
      // Generate new key
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}_${Math.random()}`
      );
      await SecureStore.setItemAsync('encryption_key', key);
    }

    this.encryptionKey = key;
    return key;
  }

  // Simple encryption (for demonstration - use proper encryption in production)
  async encryptData(data: string): Promise<string> {
    try {
      // In production, use a proper encryption library like react-native-aes-crypto
      const key = await this.getEncryptionKey();
      const encrypted = Buffer.from(data).toString('base64');
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  // Simple decryption (for demonstration - use proper decryption in production)
  async decryptData(encryptedData: string): Promise<string> {
    try {
      // In production, use a proper encryption library
      const decrypted = Buffer.from(encryptedData, 'base64').toString();
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  // Store encrypted data
  async storeEncrypted(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encryptData(value);
      await SecureStore.setItemAsync(key, encrypted);
    } catch (error) {
      console.error('Store encrypted error:', error);
      throw error;
    }
  }

  // Retrieve and decrypt data
  async retrieveEncrypted(key: string): Promise<string | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(key);
      if (!encrypted) {
        return null;
      }
      return await this.decryptData(encrypted);
    } catch (error) {
      console.error('Retrieve encrypted error:', error);
      return null;
    }
  }

  // Hash sensitive data (like passwords)
  async hashData(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }
}

export default new EncryptionService();
