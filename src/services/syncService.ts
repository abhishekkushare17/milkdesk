import { SyncStatus, QueuedMutation } from '../types';

type SyncListener = (status: SyncStatus, queueLength: number) => void;

export class SyncService {
  private static status: SyncStatus = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  private static queue: QueuedMutation[] = [];
  private static listeners: Set<SyncListener> = new Set();
  private static simulatedOffline = false;

  public static initialize(): void {
    const savedQueue = localStorage.getItem('milkdesk_mutation_queue');
    if (savedQueue) {
      try {
        this.queue = JSON.parse(savedQueue);
      } catch (e) {
        this.queue = [];
      }
    }

    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  public static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.queue.length);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach(l => l(this.status, this.queue.length));
  }

  private static handleNetworkChange(online: boolean): void {
    if (this.simulatedOffline) return;
    if (online) {
      this.syncPendingMutations();
    } else {
      this.status = 'OFFLINE';
      this.notify();
    }
  }

  public static toggleSimulateOffline(): boolean {
    this.simulatedOffline = !this.simulatedOffline;
    if (this.simulatedOffline) {
      this.status = 'OFFLINE';
    } else {
      this.syncPendingMutations();
    }
    this.notify();
    return this.simulatedOffline;
  }

  public static isOffline(): boolean {
    return this.simulatedOffline || !navigator.onLine;
  }

  public static getStatus(): SyncStatus {
    return this.status;
  }

  public static getQueue(): QueuedMutation[] {
    return [...this.queue];
  }

  public static queueMutation(action: string, payload: any): void {
    const mutation: QueuedMutation = {
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      payload,
      timestamp: new Date().toISOString()
    };
    this.queue.push(mutation);
    localStorage.setItem('milkdesk_mutation_queue', JSON.stringify(this.queue));
    this.notify();
  }

  public static syncPendingMutations(): void {
    if (this.queue.length === 0) {
      this.status = 'ONLINE';
      this.notify();
      return;
    }

    this.status = 'SYNCING';
    this.notify();

    setTimeout(() => {
      // Simulate safe idempotence verification & server syncing
      this.queue = [];
      localStorage.removeItem('milkdesk_mutation_queue');
      this.status = 'SYNC COMPLETE';
      this.notify();

      setTimeout(() => {
        this.status = 'ONLINE';
        this.notify();
      }, 2500);
    }, 1200);
  }
}
