import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Moon, Sun, Languages, Save, Monitor } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AppearanceSettingsData {
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
  rtlDirection: boolean;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  animations: boolean;
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  density: 'comfortable' | 'compact' | 'spacious';
}

const defaultSettings: AppearanceSettingsData = {
  theme: 'system',
  language: 'ar',
  rtlDirection: true,
  fontSize: 'medium',
  compactMode: false,
  animations: true,
  primaryColor: '#0ea5e9',
  accentColor: '#64748b',
  borderRadius: 'medium',
  density: 'comfortable',
};

export function AppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('appearance_settings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
      
      // تحميل الثيم الحالي
      const currentTheme = localStorage.getItem('dark_mode') === 'true' ? 'dark' : 'light';
      setSettings(prev => ({ ...prev, theme: currentTheme }));
    } catch (error) {
      console.error('خطأ في تحميل إعدادات المظهر:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('appearance_settings', JSON.stringify(settings));
      
      // تطبيق الثيم
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dark_mode', 'true');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dark_mode', 'false');
      } else {
        // نظام
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
        localStorage.setItem('dark_mode', prefersDark.toString());
      }

      // تطبيق اتجاه النص
      document.documentElement.dir = settings.rtlDirection ? 'rtl' : 'ltr';
      
      toast({
        title: "تم حفظ إعدادات المظهر",
        description: "تم تطبيق التغييرات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ إعدادات المظهر",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof AppearanceSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSetting('theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  };

  return (
    <div className="space-y-6">
      {/* إعدادات الثيم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            المظهر والثيم
          </CardTitle>
          <CardDescription>
            تخصيص مظهر التطبيق وألوانه
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* اختيار الثيم */}
          <div className="space-y-3">
            <Label>نمط المظهر</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => applyTheme('light')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  settings.theme === 'light' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm">فاتح</span>
              </button>
              
              <button
                onClick={() => applyTheme('dark')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  settings.theme === 'dark' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm">داكن</span>
              </button>
              
              <button
                onClick={() => applyTheme('system')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  settings.theme === 'system' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm">النظام</span>
              </button>
            </div>
          </div>

          {/* إعدادات أخرى */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* حجم الخط */}
            <div className="space-y-2">
              <Label>حجم الخط</Label>
              <Select 
                value={settings.fontSize} 
                onValueChange={(value) => updateSetting('fontSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">صغير</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="large">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* كثافة المحتوى */}
            <div className="space-y-2">
              <Label>كثافة المحتوى</Label>
              <Select 
                value={settings.density} 
                onValueChange={(value) => updateSetting('density', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">مضغوط</SelectItem>
                  <SelectItem value="comfortable">مريح</SelectItem>
                  <SelectItem value="spacious">واسع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* استدارة الحواف */}
            <div className="space-y-2">
              <Label>استدارة الحواف</Label>
              <Select 
                value={settings.borderRadius} 
                onValueChange={(value) => updateSetting('borderRadius', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  <SelectItem value="small">صغير</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="large">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* مفاتيح التبديل */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الحركات والانتقالات</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل الحركات البصرية والانتقالات
                </p>
              </div>
              <Switch
                checked={settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الوضع المضغوط</Label>
                <p className="text-sm text-muted-foreground">
                  عرض المزيد من المحتوى في مساحة أقل
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting('compactMode', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات اللغة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            اللغة والاتجاه
          </CardTitle>
          <CardDescription>
            تخصيص لغة التطبيق واتجاه النص
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* اللغة */}
            <div className="space-y-2">
              <Label>لغة التطبيق</Label>
              <Select 
                value={settings.language} 
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* اتجاه النص */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الكتابة من اليمين إلى اليسار</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل اتجاه النص العربي
                </p>
              </div>
              <Switch
                checked={settings.rtlDirection}
                onCheckedChange={(checked) => updateSetting('rtlDirection', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* زر الحفظ */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'جاري الحفظ...' : 'حفظ إعدادات المظهر'}
        </Button>
      </div>
    </div>
  );
}