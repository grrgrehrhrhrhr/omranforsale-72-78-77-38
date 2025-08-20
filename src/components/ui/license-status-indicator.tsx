import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LicenseManager } from '@/utils/licenseManager';
import { useAuth } from '@/contexts/AuthContext';

export function LicenseStatusIndicator() {
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    // تجاهل للمستخدم المطور
    if (user?.id === 'developer-omrani') {
      return;
    }

    const checkLicense = async () => {
      try {
        const validation = await LicenseManager.validateLicense();
        const currentLicense = LicenseManager.getCurrentLicense();
        
        setIsValid(validation.isValid);
        setDaysRemaining(validation.daysRemaining || 0);
        setLicenseInfo(currentLicense);
      } catch (error) {
        console.error('خطأ في فحص حالة الترخيص:', error);
        setIsValid(false);
      }
    };

    checkLicense();
    
    // تحديث كل دقيقة
    const interval = setInterval(checkLicense, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  // لا تعرض المؤشر للمستخدم المطور
  if (user?.id === 'developer-omrani') {
    return null;
  }

  // لا تعرض المؤشر إذا لم يتم تحميل بيانات الترخيص
  if (!licenseInfo) {
    return null;
  }

  const getStatusBadge = () => {
    if (!isValid) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          منتهي الصلاحية
        </Badge>
      );
    }

    if (daysRemaining <= 7) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3" />
          ينتهي خلال {daysRemaining} أيام
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
        <Shield className="h-3 w-3" />
        مفعل
      </Badge>
    );
  };

  const getLicenseTypeLabel = (type: string) => {
    switch (type) {
      case 'trial': return 'تجريبي';
      case 'basic': return 'أساسي';
      case 'professional': return 'احترافي';
      case 'enterprise': return 'مؤسسي';
      default: return type;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-2">
          {getStatusBadge()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            حالة الترخيص
          </DialogTitle>
          <DialogDescription>
            معلومات تفصيلية عن ترخيص النظام
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {getLicenseTypeLabel(licenseInfo.type)}
                </CardTitle>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">نوع الترخيص</p>
                  <p className="font-medium">{getLicenseTypeLabel(licenseInfo.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحد الأقصى للمستخدمين</p>
                  <p className="font-medium">{licenseInfo.maxUsers}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">اسم الشركة</p>
                <p className="font-medium">{licenseInfo.companyName}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                <p className="font-medium">
                  {new Date(licenseInfo.expiryDate).toLocaleDateString('ar-EG')}
                </p>
              </div>
              
              {isValid && daysRemaining > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
                  <p className={`font-medium ${
                    daysRemaining <= 7 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {daysRemaining} يوم
                  </p>
                </div>
              )}
              
              {!isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">
                    انتهت صلاحية الترخيص
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    يرجى تجديد الترخيص للمتابعة
                  </p>
                </div>
              )}
              
              {isValid && daysRemaining <= 7 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium">
                    تحذير: ينتهي الترخيص قريباً
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    يرجى تجديد الترخيص قبل انتهاء الصلاحية
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              للحصول على ترخيص جديد أو التجديد، يرجى التواصل مع الدعم الفني
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}