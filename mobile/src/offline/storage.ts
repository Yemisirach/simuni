import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedAction {
  id: string;
  kind: 'order' | 'gps-ping';
  payload: any;
  createdAt: string;
  attempts: number;
}

const QUEUE_KEY = 'simuni_offline_queue';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function readQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function pushToQueue(kind: QueuedAction['kind'], payload: any): Promise<QueuedAction> {
  const queue = await readQueue();
  const item: QueuedAction = { id: uid(), kind, payload, createdAt: new Date().toISOString(), attempts: 0 };
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((i) => i.id !== id));
}

export async function bumpAttempts(id: string): Promise<void> {
  const queue = await readQueue();
  const item = queue.find((i) => i.id === id);
  if (item) item.attempts += 1;
  await writeQueue(queue);
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}
