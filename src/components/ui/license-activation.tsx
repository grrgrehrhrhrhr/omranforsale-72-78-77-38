import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { LicenseManager } from '@/utils/licenseManager';
import { toast } from 'sonner';

export function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLicense, setCurrentLicense] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    checkCurrentLicense();
  }, []);

  const checkCurrentLicense = async () => {
    const result = await LicenseManager.validateLicense();
    setValidationResult(result);
    setCurrentLicense(LicenseManager.getCurrentLicense());
  };

  const handleActivation = async () => {
    if (!licenseKey) {
      toast.error("يرجى إدخال مفتاح الترخيص");
      return;
    }

    setIsLoading(true);
    try {
      const result = await LicenseManager.activateLicense(licenseKey);

      if (result.success) {
        toast.success("تم تفعيل الترخيص بنجاح!");
        
        await checkCurrentLicense();
        setLicenseKey('');
      } else {
        toast.error(result.error || "حدث خطأ في التفعيل");
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const getLicenseTypeBadge = (type: string) => {
    const badges = {
      trial: { label: 'تجريبي', variant: 'secondary' as const },
      basic: { label: 'أساسي', variant: 'default' as const },
      professional: { label: 'احترافي', variant: 'default' as const },
      enterprise: { label: 'المؤسسات', variant: 'default' as const }
    };
    
    const badge = badges[type as keyof typeof badges] || badges.basic;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 7) return 'text-red-600';
    if (days <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* حالة الترخيص الحالي */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              حالة الترخيص
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.isValid ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  الترخيص نشط وصالح
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validationResult.error}
                </AlertDescription>
              </Alert>
            )}

            {currentLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">نوع الترخيص</Label>
                  <div>{getLicenseTypeBadge(currentLicense.type)}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">اسم الشركة</Label>
                  <p className="text-sm">{currentLicense.companyName}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">البريد الإلكتروني</Label>
                  <p className="text-sm">{currentLicense.contactEmail}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">عدد المستخدمين المسموح</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{currentLicense.maxUsers}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">تاريخ الانتهاء</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(currentLicense.expiryDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                {validationResult.daysRemaining !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">الأيام المتبقية</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className={getDaysRemainingColor(validationResult.daysRemaining)}>
                        {validationResult.daysRemaining} يوم
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* رسالة إرشادية عند ظهور خطأ الجهاز */}
      {validationResult && !validationResult.isValid && validationResult.error?.includes('الجهاز') && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              مشكلة في تسجيل الجهاز
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            <p className="mb-4">
              يبدو أن الترخيص مربوط بجهاز آخر. هذا يحدث في الحالات التالية:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>تم تفعيل الترخيص على جهاز مختلف</li>
              <li>تم تغيير مواصفات الجهاز (هاردوير جديد)</li>
              <li>مشكلة مؤقتة في تحديد هوية الجهاز</li>
            </ul>
            <p className="mb-4">
              <strong>الحلول المقترحة:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>تأكد من أنك تستخدم نفس الجهاز المفعل عليه الترخيص</li>
              <li>إذا غيرت مواصفات الجهاز، ستحتاج لإعادة تفعيل الترخيص</li>
              <li>تواصل مع الدعم الفني إذا استمرت المشكلة</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* تفعيل ترخيص جديد */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            تفعيل ترخيص جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license-key">مفتاح الترخيص</Label>
            <Input
              id="license-key"
              placeholder="أدخل مفتاح الترخيص"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleActivation}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'جاري التفعيل...' : 'تفعيل الترخيص'}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}