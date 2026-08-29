import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { getLoanDueDate } from '../utils/loanUtils';
import { Clock, DollarSign, X, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatTZS } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { safeLocalStorage } from '../utils/storage';

export interface UpcomingLoanAlert {
  id: string;
  orderId: string;
  productSummary: string;
  remainingBalance: number;
  daysRemaining: number;
  dueDate: Date;
}

export const useLoanAlerts = (orders: Order[], user: any, onTrackLoan: () => void) => {
  const [alerts, setAlerts] = useState<UpcomingLoanAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only process if user is logged in
    if (!user || (!user.id && !user.uid)) {
      setAlerts([]);
      return;
    }
    
    const userId = user.id || user.uid;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming: UpcomingLoanAlert[] = [];
    const newAlertsForNotification: UpcomingLoanAlert[] = [];

    orders.forEach(order => {
      // Check if it's a loan for the current user and not fully paid
      const orderUserId = order.userId || order.user_id || order.customerId || order.customer_id;
      if (
        orderUserId === userId && 
        (order.isLoan || order.is_loan) && 
        order.loanStatus !== 'paid' && 
        order.status !== 'Completed' && 
        (order.loanBalance || order.loan_balance || 0) > 0
      ) {
        const dueDateStr = getLoanDueDate(order as any);
        if (!dueDateStr) return;

        const dueDate = new Date(dueDateStr);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isUpcoming = diffDays >= 0 && diffDays <= 3;
        const isOverdueMilestone = [-1, -3, -7, -15, -30, -60].includes(diffDays);

        // Show alert if deadline is upcoming, or specifically on requested overdue milestones
        if (isUpcoming || isOverdueMilestone) {
          const alertItem = {
            id: `alert-${order.id}`,
            orderId: order.id,
            productSummary: order.items.map(i => i.product.name).join(', ') || 'Loan',
            remainingBalance: (order.loanBalance || order.loan_balance || 0),
            daysRemaining: diffDays,
            dueDate: dueDate
          };
          upcoming.push(alertItem);
          
          // Check if we already notified about this today (using localStorage)
          const notifiedKey = `ge_notified_loan_${order.id}_${now.toDateString()}`;
          if (!safeLocalStorage.getItem(notifiedKey)) {
            newAlertsForNotification.push(alertItem);
            safeLocalStorage.setItem(notifiedKey, 'true');
          }
        }
      }
    });

    setAlerts(upcoming);

    // Trigger browser notifications for newly discovered alerts
    if (newAlertsForNotification.length > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        newAlertsForNotification.forEach(alert => {
          const isOverdue = alert.daysRemaining < 0;
          const isToday = alert.daysRemaining === 0;
          const title = isOverdue ? 'Loan Overdue' : isToday ? 'Loan Due Today' : 'Upcoming Loan Payment';
          const body = `You have an unpaid balance of ${formatTZS(alert.remainingBalance)} for ${alert.productSummary}.`;
          
          new Notification(title, {
            body,
            icon: '/icon.png', // Assuming an icon exists, or fallback to default
          });
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            newAlertsForNotification.forEach(alert => {
              const isOverdue = alert.daysRemaining < 0;
              const isToday = alert.daysRemaining === 0;
              const title = isOverdue ? 'Loan Overdue' : isToday ? 'Loan Due Today' : 'Upcoming Loan Payment';
              const body = `You have an unpaid balance of ${formatTZS(alert.remainingBalance)} for ${alert.productSummary}.`;
              
              new Notification(title, {
                body,
                icon: '/icon.png',
              });
            });
          }
        });
      }
    }
  }, [orders, user]);

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const dismissAlert = (id: string) => {
    triggerHaptic('light');
    setDismissedAlerts(prev => new Set(prev).add(id));
  };

  const AlertsComponent = activeAlerts.length > 0 ? (
    <div className="fixed top-20 right-4 z-[9000] flex flex-col gap-3 w-full max-w-sm pointer-events-none sm:top-24 sm:right-6">
      {activeAlerts.map(alert => {
        const isOverdue = alert.daysRemaining < 0;
        const isToday = alert.daysRemaining === 0;
        
        return (
          <div 
            key={alert.id}
            className={`pointer-events-auto overflow-hidden rounded-2xl border ${
              isOverdue ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50' : 
              isToday ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50' : 
              'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50'
            } p-4 shadow-lg shadow-black/5 animate-in slide-in-from-right-4 fade-in duration-300 relative backdrop-blur-md`}
          >
            <button 
              onClick={() => dismissAlert(alert.id)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-2 ${
                isOverdue ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400' :
                isToday ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
              }`}>
                {isOverdue ? <ShieldAlert className="w-5 h-5" /> : 
                 isToday ? <AlertTriangle className="w-5 h-5" /> : 
                 <Clock className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 pr-4">
                <h4 className={`text-sm font-bold ${
                  isOverdue ? 'text-rose-700 dark:text-rose-300' :
                  isToday ? 'text-amber-700 dark:text-amber-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {isOverdue ? 'Loan Overdue' : isToday ? 'Loan Due Today' : 'Upcoming Loan Payment'}
                </h4>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                  You have an unpaid balance of <span className="font-bold text-slate-900 dark:text-white">{formatTZS(alert.remainingBalance)}</span> for <span className="font-bold text-slate-800 dark:text-slate-200">{alert.productSummary}</span>.
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isOverdue ? 'text-rose-600 dark:text-rose-400' :
                    isToday ? 'text-amber-600 dark:text-amber-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {isOverdue ? `${Math.abs(alert.daysRemaining)} Days Late` :
                     isToday ? 'Due Today' :
                     `Due in ${alert.daysRemaining} Day${alert.daysRemaining > 1 ? 's' : ''}`}
                  </span>
                  
                  <button
                    onClick={() => {
                      dismissAlert(alert.id);
                      onTrackLoan();
                    }}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                      isOverdue ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20' :
                      isToday ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20' :
                      'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                    }`}
                  >
                    Track Loan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return { alerts: activeAlerts, AlertsComponent };
};
