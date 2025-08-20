import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Upload,
  Save,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { LogoManager } from '@/components/ui/logo-manager';

interface CompanySettings {
  name: string;
  nameEn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  commercialRegister: string;
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  logo: string;
  industry: string;
  description: string;
}

const defaultSettings: CompanySettings = {
  name: '',
  nameEn: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxNumber: '',
  commercialRegister: '',
  currency: 'SAR',
  timezone: 'Asia/Riyadh',
  fiscalYearStart: '01-01',
  logo: '',
  industry: '',
  description: ''
};

export function CompanySetup() {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('company_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
        setIsSetupComplete(!!parsedSettings.name && !!parsedSettings.phone);
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات الشركة:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // التحقق من البيانات المطلوبة
      if (!settings.name || !settings.phone) {
        toast({
          title: "بيانات ناقصة",
          description: "يرجى ملء اسم الشركة ورقم الهاتف على الأقل",
          variant: "destructive"
        });
        return;
      }

      localStorage.setItem('company_settings', JSON.stringify(settings));
      setIsSetupComplete(true);

      // حفظ اسم البرنامج
      localStorage.setItem('program_name', settings.name);

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الشركة بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof CompanySettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const currencies = [
    { value: 'SAR', label: 'ريال سعودي (SAR)' },
    { value: 'USD', label: 'دولار أمريكي (USD)' },
    { value: 'EUR', label: 'يورو (EUR)' },
    { value: 'AED', label: 'درهم إماراتي (AED)' },
    { value: 'EGP', label: 'جنيه مصري (EGP)' },
    { value: 'JOD', label: 'دينار أردني (JOD)' }
  ];

  const industries = [
    'تجارة التجزئة',
    'تجارة الجملة',
    'الخدمات',
    'الصناعة',
    'الإنشاءات',
    'التكنولوجيا',
    'الطعام والمشروبات',
    'الأزياء والملابس',
    'الصحة والطب',
    'التعليم',
    'أخرى'
  ];

  return (
    <div className="space-y-6">
      {/* حالة الإعداد */}
      {isSetupComplete && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            تم إعداد بيانات الشركة بنجاح. يمكنك تعديلها في أي وقت.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* البيانات الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              البيانات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">اسم الشركة *</Label>
              <Input
                id="company-name"
                placeholder="أدخل اسم الشركة"
                value={settings.name}
                onChange={(e) => updateSetting('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name-en">اسم الشركة (بالإنجليزية)</Label>
              <Input
                id="company-name-en"
                placeholder="Company Name in English"
                value={settings.nameEn}
                onChange={(e) => updateSetting('nameEn', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Textarea
                id="address"
                placeholder="أدخل عنوان الشركة"
                value={settings.address}
                onChange={(e) => updateSetting('address', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">نوع النشاط</Label>
              <Select value={settings.industry} onValueChange={(value) => updateSetting('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع النشاط" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف الشركة</Label>
              <Textarea
                id="description"
                placeholder="أدخل وصفاً مختصراً عن الشركة"
                value={settings.description}
                onChange={(e) => updateSetting('description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* معلومات الاتصال */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              معلومات الاتصال
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="رقم الهاتف"
                value={settings.phone}
                onChange={(e) => updateSetting('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="البريد الإلكتروني"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">الموقع الإلكتروني</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.example.com"
                value={settings.website}
                onChange={(e) => updateSetting('website', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-number">الرقم الضريبي</Label>
              <Input
                id="tax-number"
                placeholder="الرقم الضريبي"
                value={settings.taxNumber}
                onChange={(e) => updateSetting('taxNumber', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commercial-register">رقم السجل التجاري</Label>
              <Input
                id="commercial-register"
                placeholder="رقم السجل التجاري"
                value={settings.commercialRegister}
                onChange={(e) => updateSetting('commercialRegister', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* الإعدادات المالية */}
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات المالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">العملة الافتراضية</Label>
              <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscal-year">بداية السنة المالية</Label>
              <Input
                id="fiscal-year"
                type="date"
                value={settings.fiscalYearStart}
                onChange={(e) => updateSetting('fiscalYearStart', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* الشعار والهوية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              الشعار والهوية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogoManager onLogoChange={(logo) => updateSetting('logo', logo)} />
            <p className="text-sm text-muted-foreground mt-2">
              سيظهر الشعار في الفواتير والتقارير
            </p>
          </CardContent>
        </Card>
      </div>

      {/* أزرار الحفظ */}
      <div className="flex justify-end space-x-4 space-x-reverse">
        <Button
          onClick={saveSettings}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      {/* معاينة البيانات */}
      {settings.name && (
        <Card>
          <CardHeader>
            <CardTitle>معاينة بيانات الشركة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{settings.name}</h3>
              {settings.nameEn && <p className="text-sm text-muted-foreground">{settings.nameEn}</p>}
              {settings.address && <p className="text-sm">{settings.address}</p>}
              <div className="flex flex-wrap gap-2 text-sm">
                {settings.phone && <span>📞 {settings.phone}</span>}
                {settings.email && <span>✉️ {settings.email}</span>}
                {settings.website && <span>🌐 {settings.website}</span>}
              </div>
              {settings.industry && <Badge variant="secondary">{settings.industry}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}