import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Cog, 
  Code, 
  Database, 
  AlertTriangle, 
  Settings, 
  FileText, 
  Save,
  Download,
  Upload,
  RotateCcw 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdvancedSettingsData {
  debugMode: boolean;
  verboseLogging: boolean;
  enableExperimentalFeatures: boolean;
  customCSS: string;
  customJS: string;
  databaseUrl: string;
  apiTimeout: number;
  retryAttempts: number;
  enableDevTools: boolean;
  enableConsoleLogging: boolean;
  enableErrorReporting: boolean;
  maxLogSize: number;
  enableAnalytics: boolean;
  customHeaders: string;
}

const defaultSettings: AdvancedSettingsData = {
  debugMode: false,
  verboseLogging: false,
  enableExperimentalFeatures: false,
  customCSS: '',
  customJS: '',
  databaseUrl: '',
  apiTimeout: 30000,
  retryAttempts: 3,
  enableDevTools: false,
  enableConsoleLogging: true,
  enableErrorReporting: true,
  maxLogSize: 1000,
  enableAnalytics: false,
  customHeaders: '{}',
};

export function AdvancedSettings() {
  const [settings, setSettings] = useState<AdvancedSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('advanced_settings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات المتقدمة:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('advanced_settings', JSON.stringify(settings));
      
      // تطبيق CSS المخصص
      if (settings.customCSS) {
        let styleElement = document.getElementById('custom-styles');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'custom-styles';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = settings.customCSS;
      }

      // تطبيق وضع التطوير
      if (settings.debugMode) {
        console.log('وضع التطوير مفعل');
        (window as any).debugMode = true;
      } else {
        (window as any).debugMode = false;
      }

      toast({
        title: "تم حفظ الإعدادات المتقدمة",
        description: "تم تطبيق التغييرات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات المتقدمة",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof AdvancedSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const exportSettings = () => {
    const allSettings = {
      general: JSON.parse(localStorage.getItem('general_settings') || '{}'),
      appearance: JSON.parse(localStorage.getItem('appearance_settings') || '{}'),
      notification: JSON.parse(localStorage.getItem('notification_settings') || '{}'),
      security: JSON.parse(localStorage.getItem('security_settings') || '{}'),
      integration: JSON.parse(localStorage.getItem('integration_settings') || '{}'),
      performance: JSON.parse(localStorage.getItem('performance_settings') || '{}'),
      advanced: settings,
      company: JSON.parse(localStorage.getItem('company_settings') || '{}'),
    };

    const blob = new Blob([JSON.stringify(allSettings, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "تم تصدير الإعدادات",
      description: "تم تنزيل ملف النسخة الاحتياطية للإعدادات",
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        
        // استيراد جميع الإعدادات
        Object.entries(importedSettings).forEach(([key, value]) => {
          if (key === 'advanced') {
            setSettings(value as AdvancedSettingsData);
          } else {
            localStorage.setItem(`${key}_settings`, JSON.stringify(value));
          }
        });

        toast({
          title: "تم استيراد الإعدادات",
          description: "تم استيراد جميع الإعدادات بنجاح",
        });
        
        // إعادة تحميل الصفحة لتطبيق التغييرات
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast({
          title: "خطأ في الاستيراد",
          description: "ملف الإعدادات غير صالح",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const resetAllSettings = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟ سيتم فقدان جميع التخصيصات.')) {
      // مسح جميع الإعدادات
      [
        'general_settings',
        'appearance_settings', 
        'notification_settings',
        'security_settings',
        'integration_settings',
        'performance_settings',
        'advanced_settings',
        'company_settings'
      ].forEach(key => localStorage.removeItem(key));
      
      setSettings(defaultSettings);
      
      toast({
        title: "تم إعادة تعيين الإعدادات",
        description: "تم إعادة تعيين جميع الإعدادات إلى القيم الافتراضية",
      });
      
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* إعدادات التطوير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            إعدادات التطوير
          </CardTitle>
          <CardDescription>
            إعدادات متقدمة للمطورين والمستخدمين المتقدمين
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>وضع التطوير</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل رسائل التشخيص والأدوات المتقدمة
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => updateSetting('debugMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>التسجيل المفصل</Label>
                <p className="text-sm text-muted-foreground">
                  تسجيل تفصيلي لجميع العمليات
                </p>
              </div>
              <Switch
                checked={settings.verboseLogging}
                onCheckedChange={(checked) => updateSetting('verboseLogging', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الميزات التجريبية</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل الميزات قيد التطوير (غير مستقرة)
                </p>
              </div>
              <Switch
                checked={settings.enableExperimentalFeatures}
                onCheckedChange={(checked) => updateSetting('enableExperimentalFeatures', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>أدوات المطور</Label>
                <p className="text-sm text-muted-foreground">
                  تفعيل أدوات التطوير في المتصفح
                </p>
              </div>
              <Switch
                checked={settings.enableDevTools}
                onCheckedChange={(checked) => updateSetting('enableDevTools', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الشبكة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إعدادات الشبكة والAPI
          </CardTitle>
          <CardDescription>
            تخصيص اتصالات الشبكة والAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مهلة انتظار API (ميلي ثانية)</Label>
              <Input
                type="number"
                min="1000"
                max="60000"
                value={settings.apiTimeout}
                onChange={(e) => updateSetting('apiTimeout', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>عدد محاولات الإعادة</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={settings.retryAttempts}
                onChange={(e) => updateSetting('retryAttempts', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>عناوين HTTP مخصصة (JSON)</Label>
            <Textarea
              placeholder='{"Authorization": "Bearer token", "Custom-Header": "value"}'
              value={settings.customHeaders}
              onChange={(e) => updateSetting('customHeaders', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات CSS/JS مخصص */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تخصيص المظهر والسلوك
          </CardTitle>
          <CardDescription>
            إضافة CSS و JavaScript مخصص
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>CSS مخصص</Label>
            <Textarea
              placeholder="/* أدخل CSS مخصص هنا */"
              value={settings.customCSS}
              onChange={(e) => updateSetting('customCSS', e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>JavaScript مخصص</Label>
            <Textarea
              placeholder="// أدخل JavaScript مخصص هنا"
              value={settings.customJS}
              onChange={(e) => updateSetting('customJS', e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* إدارة الإعدادات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إدارة الإعدادات
          </CardTitle>
          <CardDescription>
            تصدير واستيراد وإعادة تعيين الإعدادات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={exportSettings} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير الإعدادات
            </Button>
            
            <div>
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
                id="import-settings"
              />
              <Button asChild variant="outline" className="w-full flex items-center gap-2">
                <label htmlFor="import-settings" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  استيراد الإعدادات
                </label>
              </Button>
            </div>
            
            <Button
              onClick={() => setShowDangerZone(!showDangerZone)}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              منطقة الخطر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* منطقة الخطر */}
      {showDangerZone && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-semibold">منطقة الخطر - استخدم بحذر!</p>
              <p>العمليات التالية لا يمكن التراجع عنها.</p>
              
              <Button
                onClick={resetAllSettings}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة تعيين جميع الإعدادات
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* زر الحفظ */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات المتقدمة'}
        </Button>
      </div>
    </div>
  );
}