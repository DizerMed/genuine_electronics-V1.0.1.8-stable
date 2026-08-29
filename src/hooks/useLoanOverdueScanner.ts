import { useState, useEffect, useRef, useCallback } from 'react';
import { POSTransaction } from '../types';
import { 
  scanOverdueLoansList, 
  OverdueLoanItem, 
  playLoanAlertChime, 
  buildLoanNotificationCopy 
} from '../lib/loanOverdueWorker';

export interface UseLoanOverdueScannerResult {
  overdueLoans: OverdueLoanItem[];
  activeToastLoan: OverdueLoanItem | null;
  dismissToast: () => void;
  triggerManualScan: () => void;
  selectedRepayTxId: string | null;
  setSelectedRepayTxId: (id: string | null) => void;
  isRepayModalOpen: boolean;
  setIsRepayModalOpen: (open: boolean) => void;
  openRepayModalForTx: (txId?: string) => void;
}

export function useLoanOverdueScanner(
  posTransactions: POSTransaction[],
  intervalMs: number = 30000 // default scan every 30s
): UseLoanOverdueScannerResult {
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoanItem[]>([]);
  const [activeToastLoan, setActiveToastLoan] = useState<OverdueLoanItem | null>(null);
  const [selectedRepayTxId, setSelectedRepayTxId] = useState<string | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);

  // Keep track of which overdue loans have already triggered a notification chime in this session
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const lastScanTimeRef = useRef<number>(0);

  const runScan = useCallback(() => {
    const list = scanOverdueLoansList(posTransactions);
    setOverdueLoans(list);

    if (list.length > 0) {
      // Find the first overdue loan that has not yet triggered an audible chime or toast in the current cycle
      const unnotified = list.find(item => !notifiedIdsRef.current.has(item.id));
      if (unnotified) {
        notifiedIdsRef.current.add(unnotified.id);
        setActiveToastLoan(unnotified);
        playLoanAlertChime();

        // If browser notifications are permitted, show native system notification as well
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const copy = buildLoanNotificationCopy(unnotified);
            new Notification(copy.headline, {
              body: copy.body,
              icon: '/vite.svg',
              tag: `overdue-loan-${unnotified.id}`
            });
          } catch (e) {
            // ignore notification constructor failure in unsupported environments
          }
        }
      }
    } else {
      setActiveToastLoan(null);
    }
  }, [posTransactions]);

  // Request browser notification permission once on mount if possible
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch (e) {}
    }
  }, []);

  // Run on mount and whenever transactions change
  useEffect(() => {
    runScan();
  }, [runScan]);

  // Periodic interval worker
  useEffect(() => {
    const timer = setInterval(() => {
      runScan();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [runScan, intervalMs]);

  const dismissToast = useCallback(() => {
    setActiveToastLoan(null);
  }, []);

  const openRepayModalForTx = useCallback((txId?: string) => {
    if (txId) {
      setSelectedRepayTxId(txId);
    }
    setIsRepayModalOpen(true);
  }, []);

  return {
    overdueLoans,
    activeToastLoan,
    dismissToast,
    triggerManualScan: runScan,
    selectedRepayTxId,
    setSelectedRepayTxId,
    isRepayModalOpen,
    setIsRepayModalOpen,
    openRepayModalForTx
  };
}
