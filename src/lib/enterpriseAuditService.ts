import { AuditLog } from '../types';

export interface RecordAuditParams {
  action: AuditLog['action'];
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: AuditLog['targetType'];
  details: string;
  changesSummary?: { field: string; oldVal: any; newVal: any }[];
}

/**
 * Records a secure, tamper-evident audit log event
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<AuditLog | null> {
  try {
    const actorEmail = params.actorEmail || 'admin@genuine-electronics.com';
    const actorName = params.actorName || (actorEmail.includes('admin') ? 'Super Admin' : actorEmail.split('@')[0]);
    const actorRole = params.actorRole || (actorEmail.includes('admin') ? 'Super Admin' : 'Staff');

    const res = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        actorEmail,
        actorName,
        actorRole,
        timestamp: new Date().toISOString()
      })
    });

    if (!res.ok) {
      console.warn('Failed to post audit log:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.log;
  } catch (err) {
    console.error('Audit logging error:', err);
    return null;
  }
}

/**
 * Fetches historical audit trail logs from the server
 */
export async function fetchAuditLogs(limit = 200, actionFilter?: string): Promise<AuditLog[]> {
  try {
    const url = `/api/admin/audit-logs?limit=${limit}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return [];
  }
}

/**
 * Exports audit trail logs to CSV for compliance and record-keeping
 */
export function exportAuditLogsToCSV(logs: AuditLog[]): void {
  if (logs.length === 0) return;

  const headers = ['Timestamp (GMT+3)', 'Action', 'Actor Name', 'Actor Email', 'Actor Role', 'Target Type', 'Target ID', 'Details', 'IP Address'];
  const rows = logs.map(log => [
    `"${log.timestamp || ''}"`,
    `"${log.action || ''}"`,
    `"${(log.actorName || '').replace(/"/g, '""')}"`,
    `"${log.actorEmail || ''}"`,
    `"${log.actorRole || ''}"`,
    `"${log.targetType || ''}"`,
    `"${log.targetId || ''}"`,
    `"${(log.details || '').replace(/"/g, '""')}"`,
    `"${log.ipAddress || 'Internal'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Audit_Logs_Genuine_Electronics_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
