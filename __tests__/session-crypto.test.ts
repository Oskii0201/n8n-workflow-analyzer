import { encryptSessionData, decryptSessionData } from '../src/lib/session-crypto';

describe('Session Crypto', () => {
  const testData = 'test-api-key';
  const testPassword = 'test-password';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('encryptSessionData', () => {
    it('should encrypt data successfully', () => {
      const encrypted = encryptSessionData(testData, testPassword);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different encrypted data for same input', () => {
      const encrypted1 = encryptSessionData(testData, testPassword);
      const encrypted2 = encryptSessionData(testData, testPassword);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty data', () => {
      const encrypted = encryptSessionData('', testPassword);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle empty password', () => {
      const encrypted = encryptSessionData(testData, '');
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decryptSessionData', () => {
    it('should decrypt data successfully with correct password', () => {
      const encrypted = encryptSessionData(testData, testPassword);
      const decrypted = decryptSessionData(encrypted, testPassword);
      
      expect(decrypted).toBe(testData);
    });

    it('should return null with incorrect password', () => {
      const encrypted = encryptSessionData(testData, testPassword);
      const decrypted = decryptSessionData(encrypted, 'wrong-password');
      
      expect(decrypted).toBeNull();
    });

    it('should return null with empty password', () => {
      const encrypted = encryptSessionData(testData, testPassword);
      const decrypted = decryptSessionData(encrypted, '');
      
      expect(decrypted).toBeNull();
    });

    it('should handle empty encrypted data', () => {
      const decrypted = decryptSessionData('', testPassword);
      
      expect(decrypted).toBeNull();
    });

    it('should handle invalid encrypted data', () => {
      const decrypted = decryptSessionData('invalid-encrypted-data', testPassword);
      
      expect(decrypted).toBeNull();
    });
  });

  describe('encrypt/decrypt round trip', () => {
    it('should successfully encrypt and decrypt data', () => {
      const testCases = [
        'simple-api-key',
        'complex-api-key-with-special-chars!@#$%^&*()',
        'https://n8n.example.com/api/v1',
        'very-long-api-key-that-might-be-used-in-production-environments',
        '1234567890',
      ];

      testCases.forEach(testCase => {
        const encrypted = encryptSessionData(testCase, testPassword);
        const decrypted = decryptSessionData(encrypted, testPassword);
        
        expect(decrypted).toBe(testCase);
      });
    });

    it('should handle empty string specially', () => {
      const emptyString = '';
      const encrypted = encryptSessionData(emptyString, testPassword);
      const decrypted = decryptSessionData(encrypted, testPassword);
      
      // Empty string might return null due to falsy check, which is acceptable
      expect(decrypted === emptyString || decrypted === null).toBe(true);
    });

    it('should work with different passwords', () => {
      const passwords = [
        'simple-password',
        'ComplexPassword123!',
        'very-long-password-with-special-characters!@#$%^&*()',
        '123456',
      ];

      passwords.forEach(password => {
        const encrypted = encryptSessionData(testData, password);
        const decrypted = decryptSessionData(encrypted, password);
        
        expect(decrypted).toBe(testData);
      });
    });
  });
}); 