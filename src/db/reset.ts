import { db } from './schema';

export async function resetAllData(): Promise<void> {
  await db.delete();
  await db.open();
}
