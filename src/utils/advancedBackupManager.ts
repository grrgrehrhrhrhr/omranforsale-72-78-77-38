/**
 * نظام النسخ الاحتياطي المتقدم مع تشفير وضغط محسن
 */

import { storage } from '@/utils/storage';
import { toast } from 'sonner';

// خوارزميات التشفير المتقدمة
export class AdvancedEncryption {
  /**
   * تشفير البيانات باستخدام AES-GCM
   */
  static async encryptData(data: string, password: string): Promise<{
    encrypted: string;
    salt: string;
    iv: string;
    authTag: string;
  }> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // إنشاء salt عشوائي
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // إنشاء مفتاح من كلمة المرور
      const passwordBuffer = encoder.encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      // إنشاء IV عشوائي
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // تشفير البيانات
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        dataBuffer
      );
      
      // تحويل إلى Base64
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encrypted = btoa(String.fromCharCode(...encryptedArray));
      const saltBase64 = btoa(String.fromCharCode(...salt));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      
      return {
        encrypted,
        salt: saltBase64,
        iv: ivBase64,
        authTag: '' // مدمج في AES-GCM
      };
    } catch (error) {
      throw new Error(`فشل التشفير: ${error.message}`);
    }
  }

  /**
   * فك تشفير البيانات
   */
  static async decryptData(
    encryptedData: string,
    password: string,
    salt: string,
    iv: string
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // تحويل من Base64
      const saltBuffer = new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)));
      const ivBuffer = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
      const encryptedBuffer = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
      
      // إنشاء مفتاح من كلمة المرور
      const passwordBuffer = encoder.encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      // فك التشفير
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
          tagLength: 128
        },
        key,
        encryptedBuffer
      );
      
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`فشل فك التشفير: ${error.message}`);
    }
  }

  /**
   * توليد كلمة مرور قوية
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
}

// ضغط البيانات المتقدم
export class AdvancedCompression {
  /**
   * ضغط البيانات باستخدام خوارزميات متعددة
   */
  static async compressData(
    data: string,
    level: 'fast' | 'balanced' | 'maximum' = 'balanced'
  ): Promise<{ compressed: string; originalSize: number; compressedSize: number; ratio: number }> {
    try {
      const originalSize = new Blob([data]).size;
      
      // استخدام CompressionStream إذا متوفر
      if ('CompressionStream' in window) {
        const compressionFormat = this.getCompressionFormat(level);
        const stream = new CompressionStream(compressionFormat);
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(data));
        writer.close();
        
        const chunks = [];
        let result;
        while (!(result = await reader.read()).done) {
          chunks.push(result.value);
        }
        
        const compressedBuffer = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          compressedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        const compressed = btoa(String.fromCharCode(...compressedBuffer));
        const compressedSize = compressedBuffer.length;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        return { compressed, originalSize, compressedSize, ratio };
      } else {
        // استخدام ضغط بديل (LZ-string simulation)
        const compressed = this.simpleCompress(data, level);
        const compressedSize = new Blob([compressed]).size;
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;
        
        return { compressed, originalSize, compressedSize, ratio };
      }
    } catch (error) {
      throw new Error(`فشل الضغط: ${error.message}`);
    }
  }

  /**
   * إلغاء ضغط البيانات
   */
  static async decompressData(compressedData: string, level: 'fast' | 'balanced' | 'maximum' = 'balanced'): Promise<string> {
    try {
      if ('DecompressionStream' in window) {
        const compressionFormat = this.getCompressionFormat(level);
        const stream = new DecompressionStream(compressionFormat);
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        const compressedBuffer = new Uint8Array(
          atob(compressedData).split('').map(c => c.charCodeAt(0))
        );
        
        writer.write(compressedBuffer);
        writer.close();
        
        const chunks = [];
        let result;
        while (!(result = await reader.read()).done) {
          chunks.push(result.value);
        }
        
        const decompressedBuffer = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressedBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(decompressedBuffer);
      } else {
        return this.simpleDecompress(compressedData);
      }
    } catch (error) {
      throw new Error(`فشل إلغاء الضغط: ${error.message}`);
    }
  }

  private static getCompressionFormat(level: string): 'gzip' | 'deflate' | 'deflate-raw' {
    switch (level) {
      case 'fast': return 'deflate';
      case 'balanced': return 'gzip';
      case 'maximum': return 'deflate-raw';
      default: return 'gzip';
    }
  }

  private static simpleCompress(data: string, level: string): string {
    // ضغط بسيط باستخدام تكرار الأحرف
    let compressed = '';
    let i = 0;
    
    while (i < data.length) {
      const char = data[i];
      let count = 1;
      
      // عد الأحرف المتكررة
      while (i + count < data.length && data[i + count] === char && count < 255) {
        count++;
      }
      
      if (count > 3 || (level === 'maximum' && count > 2)) {
        compressed += `${count}${char}`;
      } else {
        compressed += char.repeat(count);
      }
      
      i += count;
    }
    
    return btoa(compressed);
  }

  private static simpleDecompress(compressedData: string): string {
    try {
      const data = atob(compressedData);
      let decompressed = '';
      let i = 0;
      
      while (i < data.length) {
        const char = data[i];
        
        if (/\d/.test(char) && i + 1 < data.length) {
          const count = parseInt(char);
          const repeatChar = data[i + 1];
          decompressed += repeatChar.repeat(count);
          i += 2;
        } else {
          decompressed += char;
          i++;
        }
      }
      
      return decompressed;
    } catch {
      return atob(compressedData); // fallback
    }
  }
}

// نظام التحقق من سلامة البيانات
export class DataIntegrity {
  /**
   * حساب checksum متقدم للبيانات
   */
  static async calculateAdvancedChecksum(data: any): Promise<{
    sha256: string;
    md5: string;
    crc32: string;
    size: number;
    timestamp: string;
  }> {
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    
    // SHA-256
    const sha256Buffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const sha256 = Array.from(new Uint8Array(sha256Buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // MD5 (simulation - not cryptographically secure)
    const md5 = await this.calculateMD5(dataString);
    
    // CRC32 (simulation)
    const crc32 = this.calculateCRC32(dataString);
    
    return {
      sha256,
      md5,
      crc32,
      size: dataBuffer.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * التحقق من سلامة البيانات
   */
  static async verifyDataIntegrity(
    data: any,
    expectedChecksum: {
      sha256: string;
      md5: string;
      crc32: string;
      size: number;
    }
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const actualChecksum = await this.calculateAdvancedChecksum(data);
      
      if (actualChecksum.sha256 !== expectedChecksum.sha256) {
        errors.push('SHA-256 checksum mismatch');
      }
      
      if (actualChecksum.md5 !== expectedChecksum.md5) {
        errors.push('MD5 checksum mismatch');
      }
      
      if (actualChecksum.crc32 !== expectedChecksum.crc32) {
        errors.push('CRC32 checksum mismatch');
      }
      
      if (actualChecksum.size !== expectedChecksum.size) {
        errors.push('Size mismatch');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`فشل التحقق: ${error.message}`]
      };
    }
  }

  private static async calculateMD5(data: string): Promise<string> {
    // تنفيذ مبسط لـ MD5 (للعرض فقط)
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer); // استخدام SHA-1 كبديل
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32); // اقتطاع ل 32 حرف مثل MD5
  }

  private static calculateCRC32(data: string): string {
    // تنفيذ مبسط لـ CRC32
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crc ^ data.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & (-(crc & 1)));
      }
    }
    return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
  }
}

// نظام تقسيم الملفات الكبيرة
export class FileSplitter {
  /**
   * تقسيم ملف كبير إلى أجزاء صغيرة
   */
  static splitLargeFile(
    data: string,
    maxChunkSize: number = 5 * 1024 * 1024 // 5MB
  ): {
    chunks: string[];
    metadata: {
      totalChunks: number;
      totalSize: number;
      chunkSize: number;
      checksum: string;
    };
  } {
    const chunks: string[] = [];
    const totalSize = data.length;
    const totalChunks = Math.ceil(totalSize / maxChunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * maxChunkSize;
      const end = Math.min(start + maxChunkSize, totalSize);
      const chunk = data.substring(start, end);
      chunks.push(btoa(chunk)); // تشفير Base64
    }
    
    // حساب checksum للملف الكامل
    const checksum = this.calculateSimpleChecksum(data);
    
    return {
      chunks,
      metadata: {
        totalChunks,
        totalSize,
        chunkSize: maxChunkSize,
        checksum
      }
    };
  }

  /**
   * دمج الأجزاء المقسمة
   */
  static mergeSplitFile(
    chunks: string[],
    metadata: {
      totalChunks: number;
      totalSize: number;
      checksum: string;
    }
  ): { success: boolean; data?: string; error?: string } {
    try {
      if (chunks.length !== metadata.totalChunks) {
        return { success: false, error: 'عدد الأجزاء غير مطابق' };
      }
      
      let mergedData = '';
      for (const chunk of chunks) {
        mergedData += atob(chunk); // فك تشفير Base64
      }
      
      // التحقق من checksum
      const actualChecksum = this.calculateSimpleChecksum(mergedData);
      if (actualChecksum !== metadata.checksum) {
        return { success: false, error: 'checksum غير مطابق - الملف تالف' };
      }
      
      return { success: true, data: mergedData };
    } catch (error) {
      return { success: false, error: `فشل في دمج الأجزاء: ${error.message}` };
    }
  }

  private static calculateSimpleChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}