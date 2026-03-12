import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../../db/pool.js';
import { users } from '../../../shared/models/auth.js';
import { eq } from 'drizzle-orm';

type UpsertUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  private db = drizzle(pool);

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }
}

export const authStorage = new AuthStorage();
