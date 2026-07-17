export { CONTENT_DATABASE_NAME, getContentDatabase } from './contentDatabase';
export { USER_DATABASE_NAME, getUserDatabase } from './userDatabase';

import { getContentDatabase } from './contentDatabase';
import { getUserDatabase } from './userDatabase';

export async function initDatabases() {
  await Promise.all([getContentDatabase(), getUserDatabase()]);
}
