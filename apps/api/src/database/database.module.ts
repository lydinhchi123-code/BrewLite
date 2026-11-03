import { Module } from '@nestjs/common';
import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: async () => {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          throw new Error('Chưa cấu hình DATABASE_URL trong file .env');
        }

        const pool = new Pool({
          connectionString,
        });

        try {
          await pool.query('SELECT 1');
          console.log('✅ Đã kết nối PostgreSQL thành công!');
          return pool;
        } catch (error) {
          await pool.end();
          throw error;
        }
      },
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
