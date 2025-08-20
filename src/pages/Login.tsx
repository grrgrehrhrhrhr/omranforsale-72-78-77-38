import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Lock, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SupportDialog } from "@/components/ui/support-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { AccountSwitcher } from "@/components/auth/AccountSwitcher";
import { LicenseManager } from "@/utils/licenseManager";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  // Check authentication
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    
    // فحص صلاحية الترخيص عند فتح صفحة تسجيل الدخول
    const checkLicenseOnStart = async () => {
      try {
        const validation = await LicenseManager.validateLicense();
        if (!validation.isValid && validation.error?.includes('انتهت صلاحية الترخيص')) {
          toast({
            title: "انتهت صلاحية الترخيص",
            description: "يجب تجديد الترخيص للمتابعة",
            variant: "destructive",
          });
          // مسح جميع البيانات المحلية عدا بيانات المطور
          Object.keys(localStorage).forEach(key => {
            if (!key.includes('developer') && !key.includes('registered_users')) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (error) {
        console.error('خطأ في فحص الترخيص:', error);
      }
    };
    
    // تشغيل الفحص بعد ثانية واحدة
    setTimeout(checkLicenseOnStart, 1000);
    
    // Check for username parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
    }
    
    const rememberLogin = localStorage.getItem("remember_login");
    if (rememberLogin === "true") {
      setRememberMe(true);
    }
  }, [navigate, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // تحقق من بيانات المطور الخاصة
      const isDeveloper = username === "omrani" && password === "ahmed01122329724K";
      
      if (isDeveloper) {
        // إعطاء صلاحيات المطور مباشرة بدون كود ترخيص
        localStorage.setItem('developer_mode', 'true');
        localStorage.setItem('license_status', JSON.stringify({
          isActivated: true,
          type: 'DEVELOPER',
          features: ['ALL_FEATURES'],
          companyInfo: {
            name: "المطور - عمران",
            email: "developer@omran.com"
          },
          activatedAt: new Date().toISOString(),
          expiresAt: '2099-12-31T23:59:59.999Z'
        }));
        
        const success = await login(username, password);
        
        if (success) {
          if (rememberMe) {
            localStorage.setItem("remember_login", "true");
          } else {
            localStorage.removeItem("remember_login");
          }
          
          toast({
            title: "تم تسجيل الدخول كمطور",
            description: "مرحباً بك! لديك صلاحيات كاملة كمطور النظام",
          });
          
          navigate("/", { replace: true });
        }
        return;
      }

      // التحقق من كود الترخيص للمستخدمين العاديين
      if (!licenseKey.trim()) {
        toast({
          title: "مفتاح الترخيص مطلوب",
          description: "يرجى إدخال مفتاح الترخيص للمتابعة",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // التحقق من صحة كود الترخيص
      const licenseValidation = await LicenseManager.validateLicenseKey(licenseKey);
      if (!licenseValidation.isValid) {
        toast({
          title: "مفتاح ترخيص غير صالح",
          description: licenseValidation.error || "مفتاح الترخيص المدخل غير صحيح",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // تفعيل الترخيص مع معلومات وهمية للشركة
      const activationResult = await LicenseManager.activateLicense(licenseKey, {
        name: "شركة عمران",
        email: "info@omran.com"
      });

      if (!activationResult.success) {
        toast({
          title: "فشل في تفعيل الترخيص",
          description: activationResult.error || "حدث خطأ في تفعيل الترخيص",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // تسجيل الدخول بعد التحقق من الترخيص
      const success = await login(username, password);
      
      if (success) {
        if (rememberMe) {
          localStorage.setItem("remember_login", "true");
        } else {
          localStorage.removeItem("remember_login");
        }
        
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "تم التحقق من الترخيص وتسجيل الدخول بنجاح",
        });
        
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Login Card */}
        <Card className="border-0 shadow-lg bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-arabic-elegant text-center text-primary">
              عمران للمبيعات
            </CardTitle>
            <CardDescription className="text-center mt-2">
              <span className="font-medium">الحسابات</span> <span className="font-tajawal">لنشاطك التجارى صارت أسهل مع تطبيقنا</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-cairo">اسم المستخدم</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    dir="rtl"
                    className="pr-10 text-right placeholder:text-right"
                    autoComplete="username"
                  />
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="font-cairo">كلمة المرور</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="rtl"
                    className="pr-10 pl-10 text-right placeholder:text-right"
                    autoComplete="current-password"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* License Key Field - مخفي للمطور */}
              {!(username === "omrani" && password === "ahmed01122329724K") && (
                <div className="space-y-2">
                  <Label htmlFor="licenseKey" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-cairo">مفتاح الترخيص</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="licenseKey"
                      type="text"
                      placeholder="أدخل مفتاح الترخيص"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      required
                      dir="rtl"
                      className="pr-10 text-right placeholder:text-right"
                      autoComplete="off"
                    />
                    <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    مثال: OMRAN-BASIC-XXXX أو OMRAN-PRO-XXXX
                  </p>
                </div>
              )}

              {/* Developer Access Indicator */}
              {username === "omrani" && password === "ahmed01122329724K" && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">وضع المطور مُفعّل</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ستحصل على صلاحيات كاملة بدون الحاجة لمفتاح ترخيص
                  </p>
                </div>
              )}

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <span className="text-sm text-muted-foreground font-tajawal">تذكرني</span>
                </label>
              </div>

            {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity duration-200 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري التحقق...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-cairo">
                    تسجيل الدخول
                  </div>
                )}
              </Button>
            </form>


            {/* Register Link */}
            <div className="text-center space-y-2 pt-4">
              <p className="text-sm text-muted-foreground font-cairo">
                ليس لديك حساب؟{" "}
                <Link 
                  to="/register" 
                  className="text-primary hover:text-primary-hover font-medium transition-colors font-cairo no-underline"
                >
                  إنشاء حساب
                </Link>
              </p>
              <p className="text-sm text-muted-foreground font-cairo">
                <Link 
                  to="/forgot-password"
                  className="text-primary hover:text-primary-hover font-medium transition-colors font-cairo no-underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              </p>
              <p className="text-xs text-muted-foreground font-cairo">
                <button 
                  onClick={() => setSupportDialogOpen(true)}
                  className="text-primary hover:text-primary-hover font-medium transition-colors font-cairo"
                >
                  تواصل مع الدعم الفني
                </button>
              </p>
              <p className="text-xs text-muted-foreground font-munada">
                © 2025 عمران للمبيعات - جميع الحقوق محفوظة
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="mt-4 border-0 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center space-y-1">
              <h3 className="font-medium text-sm font-cairo">نظام إدارة شامل</h3>
              <p className="text-xs text-muted-foreground font-cairo">
                إدارة المبيعات • المخزون • العملاء • التقارير
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Dialog */}
      <SupportDialog 
        open={supportDialogOpen} 
        onOpenChange={setSupportDialogOpen} 
      />
    </div>
  );
}