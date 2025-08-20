import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SessionsStats } from '@/components/sessions/SessionsStats';
import { SessionCard } from '@/components/sessions/SessionCard';
import { useSessionManager } from '@/hooks/useSessionManager';
import { LogOut, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Sessions() {
  const { sessions, stats, loading, fetchSessions, terminateSession, terminateAllOtherSessions } = useSessionManager();
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);

  const handleTerminateAllOtherSessions = async () => {
    setIsTerminatingAll(true);
    await terminateAllOtherSessions();
    setIsTerminatingAll(false);
  };

  const getCurrentSessionToken = () => localStorage.getItem('session_token');

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">إدارة الجلسات</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">إدارة الجلسات</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  تسجيل الخروج من جميع الأجهزة
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من تسجيل الخروج من جميع الأجهزة؟ سيتم إنهاء جميع الجلسات النشطة عدا الجلسة الحالية.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleTerminateAllOtherSessions}
                    disabled={isTerminatingAll}
                  >
                    {isTerminatingAll ? 'جاري الإنهاء...' : 'تأكيد'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <SessionsStats stats={stats} />

        <Card>
          <CardHeader>
            <CardTitle>قائمة الجلسات</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد جلسات متاحة
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onTerminate={terminateSession}
                    isCurrentSession={session.session_token === getCurrentSessionToken()}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}