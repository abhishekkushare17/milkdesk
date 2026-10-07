import { AuditLog } from '../types';
import { Database } from './storage';

export class AuditService {
  public static log(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = Database.getAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString()
    };
    Database.setAuditLogs([newLog, ...logs.slice(0, 499)]); // Keep last 500 audit logs
  }
}
