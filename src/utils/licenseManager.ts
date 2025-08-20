/**
 * نظام إدارة التراخيص والحماية
 */

interface LicenseInfo {
  key: string;
  type: 'trial' | 'basic' | 'professional' | 'enterprise';
  expiryDate: string;
  maxUsers: number;
  features: string[];
  companyName: string;
  contactEmail: string;
}

interface DeviceInfo {
  machineId: string;
  cpuId: string;
  diskId: string;
  osInfo: string;
  registeredAt: string;
}

export class LicenseManager {
  private static readonly LICENSE_KEY = 'omran_license_info';
  private static readonly DEVICE_KEY = 'omran_device_info';
  private static readonly TRIAL_DAYS = 5;

  /**
   * التحقق من صحة الترخيص
   */
  static async validateLicense(): Promise<{
    isValid: boolean;
    license?: LicenseInfo;
    error?: string;
    daysRemaining?: number;
  }> {
    try {
      const licenseData = localStorage.getItem(this.LICENSE_KEY);
      
      if (!licenseData) {
        // إنشاء ترخيص تجريبي
        return await this.createTrialLicense();
      }

      const license: LicenseInfo = JSON.parse(licenseData);
      
      // التحقق من انتهاء الصلاحية
      const expiryDate = new Date(license.expiryDate);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        return {
          isValid: false,
          error: 'انتهت صلاحية الترخيص. يجب تفعيل ترخيص جديد لاستخدام البرنامج.',
          daysRemaining: 0
        };
      }

      // التحقق من الجهاز
      const deviceValidation = await this.validateDevice();
      if (!deviceValidation.isValid) {
        return {
          isValid: false,
          error: 'الترخيص مربوط بجهاز آخر',
          daysRemaining
        };
      }

      return {
        isValid: true,
        license,
        daysRemaining
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'خطأ في التحقق من الترخيص'
      };
    }
  }

  /**
   * إنشاء ترخيص تجريبي
   */
  private static async createTrialLicense(): Promise<{
    isValid: boolean;
    license?: LicenseInfo;
    error?: string;
    daysRemaining?: number;
  }> {
    try {
      const machineId = await this.getMachineId();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.TRIAL_DAYS);

      const trialLicense: LicenseInfo = {
        key: `TRIAL-${machineId.slice(0, 8)}-${Date.now()}`,
        type: 'trial',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 1,
        features: ['basic_accounting', 'inventory', 'reports'],
        companyName: 'نسخة تجريبية',
        contactEmail: ''
      };

      localStorage.setItem(this.LICENSE_KEY, JSON.stringify(trialLicense));
      
      // حفظ معلومات الجهاز
      await this.registerDevice();

      return {
        isValid: true,
        license: trialLicense,
        daysRemaining: this.TRIAL_DAYS
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'فشل في إنشاء الترخيص التجريبي'
      };
    }
  }

  /**
   * تفعيل ترخيص جديد
   */
  static async activateLicense(licenseKey: string, companyInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // محاكاة التحقق من مفتاح الترخيص
      const validation = await this.validateLicenseKey(licenseKey);
      
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const license: LicenseInfo = {
        key: licenseKey,
        type: validation.type!,
        expiryDate: validation.expiryDate!,
        maxUsers: validation.maxUsers!,
        features: validation.features!,
        companyName: companyInfo?.name || 'شركة غير محددة',
        contactEmail: companyInfo?.email || ''
      };

      localStorage.setItem(this.LICENSE_KEY, JSON.stringify(license));
      await this.registerDevice();

      return { success: true };
    } catch (error) {
      return { success: false, error: 'خطأ في تفعيل الترخيص' };
    }
  }

  /**
   * التحقق من صحة مفتاح الترخيص
   */
  static async validateLicenseKey(key: string): Promise<{
    isValid: boolean;
    type?: LicenseInfo['type'];
    expiryDate?: string;
    maxUsers?: number;
    features?: string[];
    error?: string;
  }> {
    // محاكاة التحقق من الخادم
    await new Promise(resolve => setTimeout(resolve, 1000));

    // تحليل مفتاح الترخيص - يدعم جميع التنسيقات
    const normalized = key.replace(/\s+/g, '').toUpperCase();
    
    // إضافة سجل للتشخيص
    console.log('تحقق من مفتاح الترخيص:', normalized);
    
    if (normalized.includes('OMRAN-TRIAL-') || normalized.includes('-TRIAL-')) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 6);
      
      return {
        isValid: true,
        type: 'trial',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 1,
        features: ['basic_accounting', 'inventory', 'reports']
      };
    } else if (normalized.includes('OMRAN-BASIC-') || normalized.includes('-BASIC-')) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      return {
        isValid: true,
        type: 'basic',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 3,
        features: ['basic_accounting', 'inventory', 'reports', 'backup']
      };
    } else if (normalized.includes('OMRAN-PRO-') || normalized.includes('-PRO-') || normalized.includes('-PROFESSIONAL-')) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      return {
        isValid: true,
        type: 'professional',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 10,
        features: ['all_features']
      };
    } else if (normalized.includes('OMRAN-ENTERPRISE-') || normalized.includes('-ENTERPRISE-')) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      return {
        isValid: true,
        type: 'enterprise',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 100,
        features: ['all_features']
      };
    } else if (normalized.includes('OMRAN-INVESTORS-') || normalized.includes('-INVESTORS-')) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      return {
        isValid: true,
        type: 'enterprise',
        expiryDate: expiryDate.toISOString(),
        maxUsers: 1000,
        features: ['all_features']
      };
    } else {
      return {
        isValid: false,
        error: 'مفتاح الترخيص غير صحيح أو بتنسيق خاطئ'
      };
    }
  }

  /**
   * التحقق من الجهاز
   */
  private static async validateDevice(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const storedDevice = localStorage.getItem(this.DEVICE_KEY);
      const currentMachineId = await this.getMachineId();

      if (!storedDevice) {
        return { isValid: true }; // جهاز جديد
      }

      const deviceInfo: DeviceInfo = JSON.parse(storedDevice);
      
      if (deviceInfo.machineId !== currentMachineId) {
        // السماح بإعادة تسجيل الجهاز إذا كان من نفس المستخدم
        console.warn('تم اكتشاف جهاز مختلف، جاري إعادة التسجيل...');
        await this.registerDevice();
        return { isValid: true };
      }

      return { isValid: true };
    } catch (error) {
      console.error('خطأ في التحقق من الجهاز:', error);
      return { isValid: true }; // السماح بالمرور في حالة الخطأ
    }
  }

  /**
   * تسجيل الجهاز
   */
  private static async registerDevice(): Promise<void> {
    try {
      const machineId = await this.getMachineId();
      
      const deviceInfo: DeviceInfo = {
        machineId,
        cpuId: navigator.hardwareConcurrency?.toString() || 'unknown',
        diskId: 'browser',
        osInfo: navigator.userAgent,
        registeredAt: new Date().toISOString()
      };

      localStorage.setItem(this.DEVICE_KEY, JSON.stringify(deviceInfo));
    } catch (error) {
      console.error('فشل في تسجيل الجهاز:', error);
    }
  }

  /**
   * الحصول على معرف الجهاز
   */
  private static async getMachineId(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI?.getMachineId) {
      try {
        return await window.electronAPI.getMachineId();
      } catch (error) {
        console.warn('فشل في الحصول على معرف الجهاز:', error);
      }
    }
    
    // fallback للمتصفح
    return `browser-${navigator.userAgent.slice(0, 20)}-${Date.now()}`;
  }

  /**
   * الحصول على معلومات الترخيص الحالية
   */
  static getCurrentLicense(): LicenseInfo | null {
    try {
      const licenseData = localStorage.getItem(this.LICENSE_KEY);
      return licenseData ? JSON.parse(licenseData) : null;
    } catch {
      return null;
    }
  }

  /**
   * التحقق من وجود ميزة محددة
   */
  static hasFeature(feature: string): boolean {
    const license = this.getCurrentLicense();
    if (!license) return false;
    
    return license.features.includes('all_features') || license.features.includes(feature);
  }

  /**
   * إلغاء تفعيل الترخيص
   */
  static deactivateLicense(): void {
    localStorage.removeItem(this.LICENSE_KEY);
    localStorage.removeItem(this.DEVICE_KEY);
  }

  /**
   * إعادة تسجيل الجهاز (للحالات الاستثنائية)
   */
  static async resetDeviceBinding(): Promise<void> {
    localStorage.removeItem(this.DEVICE_KEY);
    await this.registerDevice();
  }

  /**
   * تجديد الترخيص
   */
  static async renewLicense(newKey: string): Promise<{ success: boolean; error?: string }> {
    const currentLicense = this.getCurrentLicense();
    if (!currentLicense) {
      return { success: false, error: 'لا يوجد ترخيص حالي' };
    }

    return await this.activateLicense(newKey, {
      name: currentLicense.companyName,
      email: currentLicense.contactEmail
    });
  }
}