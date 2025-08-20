import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key, 
  Copy, 
  Download, 
  Mail, 
  Package,
  Calendar,
  Users,
  CheckCircle,
  Plus,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface GeneratedLicense {
  key: string;
  type: string;
  clientName: string;
  email: string;
  maxUsers: number;
  expiryDate: string;
  generatedAt: string;
}

export function LicenseKeyGenerator() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [validityMonths, setValidityMonths] = useState('12');
  const [generatedLicenses, setGeneratedLicenses] = useState<GeneratedLicense[]>([]);

  // تحميل التراخيص المحفوظة عند بدء تشغيل المكون
  useEffect(() => {
    const savedLicenses = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
    setGeneratedLicenses(savedLicenses);
  }, []);
  const [currentLicense, setCurrentLicense] = useState<GeneratedLicense | null>(null);
  const [emailTemplate, setEmailTemplate] = useState(`السلام عليكم ورحمة الله وبركاته

نشكركم لاختياركم نظام عمران لإدارة الأعمال.

تفاصيل الترخيص:
- نوع الترخيص: {LICENSE_TYPE}
- عدد المستخدمين: {MAX_USERS}
- صالح حتى: {EXPIRY_DATE}

مفتاح الترخيص:
{LICENSE_KEY}

خطوات التفعيل:
1. افتح النظام
2. اذهب إلى الإعدادات > تفعيل الترخيص
3. أدخل المفتاح أعلاه
4. أدخل بيانات شركتكم

للدعم الفني: xoxobnj@gmail.com

مع أطيب التحيات
فريق عمران`);

  // تحديث قالب الإيميل عند تغيير آخر ترخيص مُنشأ
  useEffect(() => {
    if (currentLicense) {
      const updatedTemplate = emailTemplate
        .replace(/\{LICENSE_TYPE\}/g, getLicenseTypeLabel(currentLicense.type))
        .replace(/\{MAX_USERS\}/g, currentLicense.maxUsers.toString())
        .replace(/\{EXPIRY_DATE\}/g, new Date(currentLicense.expiryDate).toLocaleDateString('en-GB'))
        .replace(/\{LICENSE_KEY\}/g, currentLicense.key);
      
      // تحديث النص المعروض فقط إذا كان مختلفاً
      if (updatedTemplate !== emailTemplate) {
        setEmailTemplate(updatedTemplate);
      }
    }
  }, [currentLicense]);

  const generateLicenseKey = () => {
    if (!clientName || !clientEmail || !licenseType || !maxUsers) {
      toast({
        title: "بيانات مفقودة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const timestamp = Date.now();
    
    // تحديد البادئة الصحيحة لكل نوع ترخيص
    const prefixMap = {
      'trial': 'TRIAL',
      'basic': 'BASIC', 
      'professional': 'PRO',
      'enterprise': 'ENTERPRISE',
      'investors': 'INVESTORS'
    };
    
    const prefix = prefixMap[licenseType as keyof typeof prefixMap] || licenseType.toUpperCase();
    const hash = btoa(clientEmail + timestamp).slice(0, 8).toUpperCase();
    const key = `OMRAN-${prefix}-${new Date().getFullYear()}-${hash}`;

    const expiryDate = new Date();
    const months = parseFloat(validityMonths);
    if (months < 1) {
      // للقيم أقل من شهر، نحسبها بالأيام
      const days = Math.round(months * 30);
      expiryDate.setDate(expiryDate.getDate() + days);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + Math.round(months));
    }

    const newLicense: GeneratedLicense = {
      key,
      type: licenseType,
      clientName,
      email: clientEmail,
      maxUsers: parseInt(maxUsers),
      expiryDate: expiryDate.toISOString(),
      generatedAt: new Date().toISOString()
    };

    setGeneratedLicenses([...generatedLicenses, newLicense]);
    setCurrentLicense(newLicense); // تعيين الترخيص الحالي لتحديث القالب
    
    // حفظ في التخزين المحلي للإدارة
    const existingLicenses = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
    localStorage.setItem('generated_licenses', JSON.stringify([...existingLicenses, newLicense]));

    toast({
      title: "تم إنشاء الترخيص!",
      description: `تم إنشاء مفتاح الترخيص: ${key}`,
    });

    // إعادة تعيين النموذج
    setClientName('');
    setClientEmail('');
    setLicenseType('');
    setMaxUsers('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ المفتاح إلى الحافظة",
    });
  };

  const generateEmailContent = (license: GeneratedLicense) => {
    const baseTemplate = `السلام عليكم ورحمة الله وبركاته

نشكركم لاختياركم نظام عمران لإدارة الأعمال.

تفاصيل الترخيص:
- نوع الترخيص: {LICENSE_TYPE}
- عدد المستخدمين: {MAX_USERS}
- صالح حتى: {EXPIRY_DATE}

مفتاح الترخيص:
{LICENSE_KEY}

خطوات التفعيل:
1. افتح النظام
2. اذهب إلى الإعدادات > تفعيل الترخيص
3. أدخل المفتاح أعلاه
4. أدخل بيانات شركتكم

للدعم الفني: xoxobnj@gmail.com

مع أطيب التحيات
فريق عمران`;

    return baseTemplate
      .replace('{LICENSE_TYPE}', getLicenseTypeLabel(license.type))
      .replace('{MAX_USERS}', license.maxUsers.toString())
      .replace('{EXPIRY_DATE}', new Date(license.expiryDate).toLocaleDateString('en-GB'))
      .replace('{LICENSE_KEY}', license.key);
  };

  const sendEmail = (license: GeneratedLicense) => {
    try {
      const subject = encodeURIComponent(`ترخيص نظام عمران - ${license.clientName}`);
      const body = encodeURIComponent(generateEmailContent(license));
      const mailtoLink = `mailto:${license.email}?subject=${subject}&body=${body}`;
      
      // فتح تطبيق البريد الإلكتروني
      const link = document.createElement('a');
      link.href = mailtoLink;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "تم فتح البريد الإلكتروني",
        description: "تم فتح تطبيق البريد الإلكتروني لإرسال الترخيص",
      });
    } catch (error) {
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في فتح تطبيق البريد الإلكتروني",
        variant: "destructive"
      });
    }
  };

  const downloadLicenseFile = (license: GeneratedLicense) => {
    const content = {
      client: {
        name: license.clientName,
        email: license.email
      },
      license: {
        key: license.key,
        type: license.type,
        maxUsers: license.maxUsers,
        expiryDate: license.expiryDate,
        generatedAt: license.generatedAt
      },
      instructions: {
        ar: "تعليمات التفعيل: افتح النظام -> الإعدادات -> تفعيل الترخيص -> أدخل المفتاح",
        en: "Activation Instructions: Open System -> Settings -> License Activation -> Enter Key"
      }
    };

    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-${license.clientName.replace(/\s+/g, '-')}-${license.key}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "تم التحميل",
      description: "تم تحميل ملف الترخيص بنجاح",
    });
  };

  const exportToPDF = (license: GeneratedLicense) => {
    try {
      // إنشاء نافذة جديدة للطباعة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "خطأ في فتح النافذة",
          description: "يرجى السماح بفتح النوافذ المنبثقة لتصدير التقرير",
          variant: "destructive"
        });
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>ترخيص نظام عمران - ${license.clientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { 
              font-family: 'Cairo', Arial, sans-serif; 
              direction: rtl; 
              margin: 20px;
              color: #333;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
            }
            .title { 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              color: #1f2937;
            }
            .subtitle { 
              font-size: 18px; 
              color: #6b7280; 
              margin-bottom: 20px; 
            }
            .logo {
              width: 80px;
              height: 80px;
              background: #3b82f6;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
              font-weight: bold;
            }
            .section { 
              margin: 30px 0; 
              background: #f8fafc;
              padding: 25px;
              border-radius: 8px;
              border-right: 4px solid #3b82f6;
            }
            .section-title { 
              font-size: 20px; 
              font-weight: bold; 
              color: #1f2937;
              margin-bottom: 15px; 
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin: 20px 0; 
            }
            .info-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 12px 15px; 
              background: white;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .info-label { 
              font-weight: 600; 
              color: #374151;
            }
            .info-value { 
              color: #1f2937;
              font-weight: 500;
            }
            .license-key { 
              background: #1f2937; 
              color: white; 
              padding: 20px; 
              border-radius: 8px; 
              font-family: 'Courier New', monospace; 
              font-size: 16px; 
              text-align: center; 
              letter-spacing: 2px;
              word-break: break-all;
              margin: 20px 0;
            }
            .instructions { 
              background: #ecfdf5;
              border: 1px solid #d1fae5;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .instructions ol { 
              margin: 0; 
              padding-right: 20px; 
            }
            .instructions li { 
              margin: 8px 0; 
              font-size: 14px;
              color: #065f46;
            }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              background: #10b981;
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">عمران</div>
            <h1 class="title">ترخيص نظام عمران</h1>
            <div class="subtitle">نظام إدارة الأعمال المتكامل</div>
            <div class="status-badge">مُفعل</div>
          </div>

          <div class="section">
            <h2 class="section-title">
              <span>📋</span>
              معلومات العميل
            </h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">اسم العميل:</span>
                <span class="info-value">${license.clientName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">البريد الإلكتروني:</span>
                <span class="info-value">${license.email}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">
              <span>🔑</span>
              تفاصيل الترخيص
            </h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">نوع الترخيص:</span>
                <span class="info-value">${getLicenseTypeLabel(license.type)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">عدد المستخدمين:</span>
                <span class="info-value">${license.maxUsers} مستخدم</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ الإنشاء:</span>
                <span class="info-value">${new Date(license.generatedAt).toLocaleDateString('en-GB')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ الانتهاء:</span>
                <span class="info-value">${new Date(license.expiryDate).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">
              <span>🔐</span>
              مفتاح الترخيص
            </h2>
            <div class="license-key">
              ${license.key}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">
              <span>⚙️</span>
              خطوات التفعيل
            </h2>
            <div class="instructions">
              <ol>
                <li>افتح نظام عمران على جهازك</li>
                <li>اذهب إلى قائمة الإعدادات</li>
                <li>اختر "تفعيل الترخيص"</li>
                <li>أدخل مفتاح الترخيص الموضح أعلاه</li>
                <li>أدخل بيانات شركتك الأساسية</li>
                <li>اضغط على "تفعيل" لإكمال العملية</li>
              </ol>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">
              <span>📞</span>
              معلومات الدعم
            </h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">البريد الإلكتروني:</span>
                <span class="info-value">xoxobnj@gmail.com</span>
              </div>
              <div class="info-item">
                <span class="info-label">ساعات العمل:</span>
                <span class="info-value">الأحد - الخميس: 9 ص - 5 م</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p><strong>نظام عمران لإدارة الأعمال</strong></p>
            <p>تم إنشاء هذا الترخيص في: ${new Date(license.generatedAt).toLocaleString('en-GB')}</p>
            <p>هذا المستند سري ويجب عدم مشاركته مع أطراف أخرى</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 1000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      toast({
        title: "تم إنشاء PDF",
        description: "تم فتح نافذة الطباعة لحفظ الترخيص كملف PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير الترخيص كملف PDF",
        variant: "destructive"
      });
    }
  };

  const getLicenseTypeLabel = (type: string) => {
    const labels = {
      'trial': 'تجريبي',
      'basic': 'أساسي',
      'professional': 'احترافي', 
      'enterprise': 'المؤسسات',
      'investors': 'المستثمرين'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getLicenseTypeBadge = (type: string) => {
    const variants = {
      'trial': 'secondary' as const,
      'basic': 'default' as const,
      'professional': 'default' as const,
      'enterprise': 'default' as const,
      'investors': 'default' as const
    };
    return <Badge variant={variants[type as keyof typeof variants] || 'default'}>
      {getLicenseTypeLabel(type)}
    </Badge>;
  };

  return (
    <div className="space-y-6">
      {/* مولد مفاتيح الترخيص */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            مولد مفاتيح التراخيص
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">اسم العميل / الشركة</Label>
              <Input
                id="client-name"
                placeholder="أدخل اسم العميل"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">البريد الإلكتروني</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="أدخل البريد الإلكتروني"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-type">نوع الترخيص</Label>
              <Select value={licenseType} onValueChange={setLicenseType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الترخيص" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">تجريبي - مستخدم واحد</SelectItem>
                  <SelectItem value="basic">أساسي - 3 مستخدمين</SelectItem>
                  <SelectItem value="professional">احترافي - 10 مستخدمين</SelectItem>
                  <SelectItem value="enterprise">المؤسسات - 50 مستخدم</SelectItem>
                  <SelectItem value="investors">المستثمرين - 1000 مستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-users">عدد المستخدمين</Label>
              <Input
                id="max-users"
                type="number"
                placeholder="عدد المستخدمين المسموح"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity">فترة الصلاحية (بالأشهر)</Label>
              <Select value={validityMonths} onValueChange={setValidityMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.17">تجريبي (5 أيام)</SelectItem>
                  <SelectItem value="3">3 أشهر</SelectItem>
                  <SelectItem value="6">6 أشهر</SelectItem>
                  <SelectItem value="12">سنة واحدة</SelectItem>
                  <SelectItem value="24">سنتان</SelectItem>
                  <SelectItem value="36">3 سنوات</SelectItem>
                  <SelectItem value="60">5 سنوات</SelectItem>
                  <SelectItem value="900">75 سنة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generateLicenseKey} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            إنشاء مفتاح ترخيص
          </Button>
        </CardContent>
      </Card>

      {/* قالب الإيميل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            قالب رسالة الإرسال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email-template">محتوى الرسالة</Label>
            <Textarea
              id="email-template"
              rows={12}
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Alert className="mt-4">
            <AlertDescription className="text-sm">
              <strong>المتغيرات المتاحة:</strong><br />
              • <code>{'{LICENSE_TYPE}'}</code> - نوع الترخيص<br />
              • <code>{'{MAX_USERS}'}</code> - عدد المستخدمين<br />
              • <code>{'{EXPIRY_DATE}'}</code> - تاريخ الانتهاء<br />
              • <code>{'{LICENSE_KEY}'}</code> - مفتاح الترخيص
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* التراخيص المُنشأة */}
      {generatedLicenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              التراخيص المُنشأة ({generatedLicenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedLicenses.map((license, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{license.clientName}</h4>
                      {getLicenseTypeBadge(license.type)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(license.expiryDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded font-mono text-sm break-all">
                    {license.key}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {license.maxUsers} مستخدم
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(license.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadLicenseFile(license)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportToPDF(license)}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => sendEmail(license)}
                      >
                        <Mail className="h-4 w-4" />
                        إرسال
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}