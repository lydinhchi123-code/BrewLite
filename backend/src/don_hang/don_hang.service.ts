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
      process.env.PGSSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
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
          dh.madonhang AS madh,
          dh.madonhanghienthi,
          dh.makh,
          dh.ngaydat,
          dh.trangthai,
          dh.tongtien,
          dh.phigiaohang,
          dh.giamgia,
          dh.tamtinh,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'mactdh', ct.mactdh,
                  'tenmon', ct.tenmon,
                  'image_url', ct.image_url,
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
              WHERE ct.madonhang = dh.madonhang
            ),
            '[]'::json
          ) AS chitiet

        FROM donhang dh
        WHERE dh.makh = $1
        ORDER BY dh.ngaydat DESC, dh.madonhang DESC
        `,
        [makh],
      );

      return result.rows.map((row) => ({
        ...row,
        madh: String(row.madh),
        madonhanghienthi: row.madonhanghienthi,
        makh: row.makh === null ? null : String(row.makh),
        tongtien: Number(row.tongtien),
        tamtinh: Number(row.tamtinh),
        phigiaohang: Number(row.phigiaohang),
        giamgia: Number(row.giamgia),

        chitiet: (row.chitiet ?? []).map(
          (ct: {
            mactdh: string | number;
            dongia: string | number;
            thanhtien: string | number;
          }) => ({
            ...ct,
            mactdh: String(ct.mactdh),
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