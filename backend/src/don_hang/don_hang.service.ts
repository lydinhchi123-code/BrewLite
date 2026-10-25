import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DonHangService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error('Thiếu DATABASE_URL trong file .env');
    }

    try {
      await this.pool.query('SELECT 1');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Không thể kết nối PostgreSQL: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async getLichSuDonHang(makh: string) {
    try {
      const result = await this.pool.query(
        `
        SELECT
          dh.madh,
          dh.makh,
          dh.ngaydat,
          dh.trangthai,
          dh.tongtien,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'mactdh', ct.mactdh,
                  'tenmon', ct.tenmon,
                  'image_url', (
                    SELECT p.image_url
                    FROM menu_products p
                    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(ct.tenmon))
                    LIMIT 1
                    ),
                  'kichco', ct.kichco,
                  'duong', ct.duong,
                  'da', ct.da,
                  'topping', ct.topping,
                  'soluong', ct.soluong,
                  'dongia', ct.dongia,
                  'thanhtien', ct.thanhtien
                )
                ORDER BY ct.mactdh
              )
              FROM chitietdonhang ct
              WHERE ct.madh = dh.madh
            ),
            '[]'::json
          ) AS chitiet
        FROM donhang dh
        WHERE dh.makh = $1
        ORDER BY dh.ngaydat DESC, dh.madh DESC
        `,
        [makh],
      );

      return result.rows.map((row) => ({
        ...row,
        madh: String(row.madh),
        makh: String(row.makh),
        tongtien: Number(row.tongtien),
        chitiet: (row.chitiet ?? []).map(
          (ct: { dongia: string | number; thanhtien: string | number }) => ({
            ...ct,
            dongia: Number(ct.dongia),
            thanhtien: Number(ct.thanhtien),
          }),
        ),
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new ServiceUnavailableException(
        `Không thể lấy lịch sử đơn hàng: ${message}`,
      );
    }
  }
}
