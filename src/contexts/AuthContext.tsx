import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole, AuthContextType, DefaultRoles, DefaultPermissions, PermissionAction } from '@/types/auth';
import { storage } from '@/utils/storage';
import { toast } from 'sonner';
import { createUserSession, updateSessionActivity, validateSession } from '@/utils/sessionManager';
import { registerDeviceForUser, isDeviceAuthorized } from '@/utils/deviceManager';
import { LicenseManager } from '@/utils/licenseManager';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// المستخدم الافتراضي (للتطوير)
const defaultUser: User = {
  id: 'default-admin',
  name: 'مدير النظام',
  email: 'admin@omran.com',
  phone: '01000000000',
  role: DefaultRoles[0], // مدير النظام
  isActive: true,
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  permissions: DefaultPermissions,
  avatar: undefined,
  department: 'الإدارة'
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // التحقق من جلسة المطور أولاً
    const checkDeveloperSession = () => {
      try {
        const developerSession = localStorage.getItem('developer_session');
        if (developerSession) {
          const sessionData = JSON.parse(developerSession);
          
          // التحقق من انتهاء صلاحية الجلسة
          if (sessionData.expires > Date.now()) {
            setUser(sessionData.user);
            setIsAuthenticated(true);
            storage.setItem('current_user', sessionData.user);
            console.log('Developer session restored');
            return true;
          } else {
            // حذف الجلسة المنتهية الصلاحية
            localStorage.removeItem('developer_session');
            console.log('Developer session expired');
          }
        }
      } catch (error) {
        console.error('Error checking developer session:', error);
        localStorage.removeItem('developer_session');
      }
      return false;
    };

    // إذا تم العثور على جلسة المطور صالحة، لا نحتاج لفعل أي شيء آخر
    if (checkDeveloperSession()) {
      return;
    }

    // إعداد مستمع تغيير حالة المصادقة FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        
        setSession(session);
        
        if (session?.user) {
          // تخزين الجلسة في localStorage
          localStorage.setItem('supabase_session', JSON.stringify(session));
          
          // إنشاء كائن مستخدم من بيانات Supabase
          const supabaseUser: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'مستخدم',
            email: session.user.email || '',
            phone: session.user.user_metadata?.phone || '',
            role: DefaultRoles[0], // مدير النظام افتراضياً
            isActive: true,
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
            permissions: DefaultPermissions,
            avatar: session.user.user_metadata?.avatar_url,
            department: 'عام'
          };
          setUser(supabaseUser);
          setIsAuthenticated(true);
          storage.setItem('current_user', supabaseUser);
          
          // تسجيل الجهاز تلقائياً عند استرجاع الجلسة
          setTimeout(() => {
            registerDeviceForUser(session.user.id).catch(error => {
              console.warn('لم يتم تسجيل الجهاز تلقائياً عند استرجاع الجلسة:', error);
            });
          }, 1000);
        } else {
          // حذف الجلسة من localStorage عند تسجيل الخروج
          localStorage.removeItem('supabase_session');
          // لا نحذف جلسة المطور هنا
          if (!localStorage.getItem('developer_session')) {
            setUser(null);
            setIsAuthenticated(false);
            storage.removeItem('current_user');
          }
        }
      }
    );

    // استرجاع الجلسة المحفوظة عند بدء التطبيق (فقط لـ Supabase)
    const restoreSession = async () => {
      try {
        const savedSession = localStorage.getItem('supabase_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // التحقق من انتهاء صلاحية الجلسة
          const expiresAt = new Date(sessionData.expires_at * 1000);
          const now = new Date();
          
          if (expiresAt > now) {
            // إعادة تعيين الجلسة إذا كانت صالحة
            await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token
            });
            console.log('Session restored from localStorage');
          } else {
            // حذف الجلسة المنتهية الصلاحية
            localStorage.removeItem('supabase_session');
            console.log('Expired session removed');
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('supabase_session');
      }
    };

    // استرجاع الجلسة أولاً
    restoreSession().then(() => {
      // ثم التحقق من الجلسة الحالية
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const supabaseUser: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'مستخدم',
            email: session.user.email || '',
            phone: session.user.user_metadata?.phone || '',
            role: DefaultRoles[0],
            isActive: true,
            createdAt: session.user.created_at,
            lastLogin: new Date().toISOString(),
            permissions: DefaultPermissions,
            avatar: session.user.user_metadata?.avatar_url,
            department: 'عام'
          };
          setUser(supabaseUser);
          setIsAuthenticated(true);
          storage.setItem('current_user', supabaseUser);
        }
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // فحص الترخيص دورياً
  useEffect(() => {
    // تجاهل فحص التراخيص للمستخدم المطور
    if (!user || user.id === 'developer-omrani') {
      return;
    }

    const checkLicense = async () => {
      try {
        const validation = await LicenseManager.validateLicense();
        
        if (!validation.isValid) {
          toast.error(validation.error || 'انتهت صلاحية الترخيص');
          
          // تسجيل خروج فوري عند انتهاء الترخيص
          setTimeout(() => {
            logout();
            // مسح جميع البيانات المحلية عدا بيانات المطور
            Object.keys(localStorage).forEach(key => {
              if (!key.includes('developer')) {
                localStorage.removeItem(key);
              }
            });
          }, 3000);
          
          return;
        }

        // تحذير عند اقتراب انتهاء الترخيص
        if (validation.daysRemaining && validation.daysRemaining <= 7) {
          if (validation.daysRemaining <= 3) {
            toast.error(`تبقى ${validation.daysRemaining} أيام على انتهاء الترخيص!`);
          } else if (validation.daysRemaining <= 7) {
            toast.warning(`تبقى ${validation.daysRemaining} أيام على انتهاء الترخيص`);
          }
        }

      } catch (error) {
        console.error('خطأ في فحص الترخيص:', error);
      }
    };

    // فحص فوري عند تسجيل الدخول
    checkLicense();

    // فحص دوري كل 10 دقائق
    const interval = setInterval(() => {
      checkLicense();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    try {
      // التحقق من بيانات المطور أولاً
      if (usernameOrEmail === 'omrani' && password === 'ahmed01122329724K') {
        // إنشاء مستخدم للمطور
        const developerUser: User = {
          id: 'developer-omrani',
          name: 'عمراني - مطور',
          email: 'omranii@developer.com',
          phone: '01122329724',
          role: DefaultRoles[0], // مدير النظام
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          permissions: DefaultPermissions,
          avatar: undefined,
          department: 'التطوير'
        };
        
        setUser(developerUser);
        setIsAuthenticated(true);
        storage.setItem('current_user', developerUser);
        
        // حفظ جلسة محلية للمطور
        localStorage.setItem('developer_session', JSON.stringify({
          user: developerUser,
          timestamp: Date.now(),
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 ساعة
        }));
        
        toast.success('مرحباً بك أيها المطور!');
        return true;
      }

      // التحقق مما إذا كان الإدخال بريد إلكتروني أم اسم مستخدم
      const isEmail = usernameOrEmail.includes('@');
      
      if (isEmail) {
        // تسجيل دخول عادي بالبريد الإلكتروني
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameOrEmail,
          password,
        });

        if (error) {
          toast.error('بيانات تسجيل الدخول غير صحيحة');
          return false;
        }

        if (data.user) {
          // تسجيل الجهاز تلقائياً للمستخدمين الجدد
          try {
            await registerDeviceForUser(data.user.id);
            console.log('تم تسجيل الجهاز تلقائياً للمستخدم الجديد');
          } catch (deviceError) {
            console.warn('لم يتم تسجيل الجهاز تلقائياً:', deviceError);
            // لا نمنع تسجيل الدخول حتى لو فشل تسجيل الجهاز
          }
          
          toast.success('تم تسجيل الدخول بنجاح');
          return true;
        }
      } else {
        // البحث عن المستخدم باسم المستخدم في البيانات المحلية
        const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const foundUser = registeredUsers.find((u: any) => 
          u.username === usernameOrEmail && u.password === password
        );

        if (foundUser) {
          // إنشاء كائن مستخدم متوافق مع النظام
          const localUser: User = {
            id: foundUser.id,
            name: foundUser.name || foundUser.username,
            email: foundUser.email,
            phone: foundUser.phone || '',
            role: DefaultRoles[2], // مستخدم عادي
            isActive: true,
            createdAt: foundUser.createdAt,
            lastLogin: new Date().toISOString(),
            permissions: [],
            avatar: undefined,
            department: foundUser.department || 'عام'
          };
          
          setUser(localUser);
          setIsAuthenticated(true);
          storage.setItem('current_user', localUser);
          
          // تحديث آخر تسجيل دخول
          foundUser.lastLogin = new Date().toISOString();
          const updatedUsers = registeredUsers.map((u: any) => 
            u.id === foundUser.id ? foundUser : u
          );
          localStorage.setItem('registered_users', JSON.stringify(updatedUsers));
          
          toast.success('تم تسجيل الدخول بنجاح');
          return true;
        } else {
          toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
          return false;
        }
      }

      return false;
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
      return false;
    }
  };

  const logout = async () => {
    try {
      // إذا كان مستخدم مطور، حذف جلسته المحلية
      if (user?.id === 'developer-omrani') {
        localStorage.removeItem('developer_session');
        setUser(null);
        setIsAuthenticated(false);
        storage.removeItem('current_user');
        toast.success('تم تسجيل الخروج بنجاح');
        return;
      }

      // إذا كان مستخدم محلي (مسجل محلياً)
      if (user?.id?.startsWith('user_')) {
        setUser(null);
        setIsAuthenticated(false);
        storage.removeItem('current_user');
        toast.success('تم تسجيل الخروج بنجاح');
        return;
      }

      // لمستخدمي Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('حدث خطأ أثناء تسجيل الخروج');
        return;
      }

      // Clear local storage
      storage.removeItem('current_user');
      localStorage.removeItem("admin_authenticated");
      localStorage.removeItem("user_profile");
      localStorage.removeItem("remember_login");
      localStorage.removeItem("session_token");
      localStorage.removeItem("device_id");
      
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !isAuthenticated) return false;
    
    // مدير النظام له صلاحية على كل شيء
    if (user.role.permissions.includes('*')) return true;
    
    // التحقق من الصلاحية المحددة
    return user.role.permissions.includes(permission) ||
           user.permissions.some(p => p.id === permission);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role.name === roleName || user.role.id === roleName;
  };

  const canAccess = (module: string, action: PermissionAction): boolean => {
    if (!user || !isAuthenticated) return false;
    
    const permission = `${module}.${action}`;
    const wildcardPermission = `${module}.*`;
    
    // التحقق من الصلاحية المحددة أو العامة للمودول
    return hasPermission(permission) || hasPermission(wildcardPermission);
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<boolean> => {
    try {
      // التأكد من صحة البريد الإلكتروني
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(userData.email)) {
        toast.error('صيغة البريد الإلكتروني غير صحيحة');
        return false;
      }

      // تنظيف البيانات
      const cleanEmail = userData.email.trim().toLowerCase();
      const cleanUsername = userData.username.trim();
      
      // التحقق من طول البيانات
      if (cleanEmail.length < 5 || cleanEmail.length > 100) {
        toast.error('البريد الإلكتروني قصير جداً أو طويل جداً');
        return false;
      }

      if (cleanUsername.length < 3 || cleanUsername.length > 50) {
        toast.error('اسم المستخدم يجب أن يكون بين 3 و 50 حرف');
        return false;
      }

      // التحقق من عدم وجود المستخدم مسبقاً في التخزين المحلي
      const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
      const userExists = existingUsers.some((user: any) => 
        user.email === cleanEmail || user.username === cleanUsername
      );

      if (userExists) {
        toast.error('البريد الإلكتروني أو اسم المستخدم مسجل من قبل');
        return false;
      }

      // إنشاء المستخدم الجديد
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: cleanUsername,
        email: cleanEmail,
        password: userData.password, // في بيئة الإنتاج، يجب تشفير كلمة المرور
        phone: userData.phone || '',
        createdAt: new Date().toISOString(),
        isActive: true,
        role: DefaultRoles[2], // مستخدم عادي
        name: cleanUsername,
        lastLogin: null,
        permissions: [],
        department: 'عام'
      };

      // حفظ المستخدم في التخزين المحلي
      existingUsers.push(newUser);
      localStorage.setItem('registered_users', JSON.stringify(existingUsers));

      toast.success('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
      return true;

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى');
      return false;
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false;
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      storage.setItem('current_user', updatedUser);
      
      // تحديث الحساب في التخزين المحلي أيضاً
      const userAccounts = JSON.parse(localStorage.getItem("user_accounts") || "[]");
      const updatedAccounts = userAccounts.map((acc: any) => 
        acc.id === user.id ? { ...acc, ...updates } : acc
      );
      localStorage.setItem("user_accounts", JSON.stringify(updatedAccounts));
      
      toast.success('تم تحديث الملف الشخصي بنجاح');
      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الملف الشخصي');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    register,
    hasPermission,
    hasRole,
    canAccess,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook للتحقق من الصلاحيات مع إمكانية إخفاء المكونات
export const usePermission = (permission: string) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

// Hook للتحقق من صلاحية الوصول للمودول
export const useModuleAccess = (module: string, action: PermissionAction) => {
  const { canAccess } = useAuth();
  return canAccess(module, action);
};

// Hook للتحقق من الدور
export const useRole = (roleName: string) => {
  const { hasRole } = useAuth();
  return hasRole(roleName);
};