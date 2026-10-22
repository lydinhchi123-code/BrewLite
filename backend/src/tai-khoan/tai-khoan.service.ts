import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TaiKhoanService {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('Thiếu DATABASE_URL trong file .env');
    }

    this.pool = new Pool({
      connectionString,
      ssl:
        process.env.PGSSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  async dangKy(data: {
    hoten: string;
    sodienthoai: string;
    email?: string;
    matkhau: string;
  }) {
    const hoten = data.hoten?.trim();
    const sodienthoai = data.sodienthoai?.trim();
    const email = data.email?.trim().toLowerCase() || null;
    const matkhau = data.matkhau;

    if (!hoten || !sodienthoai || !matkhau) {
      throw new BadRequestException(
        'Vui lòng nhập họ tên, số điện thoại và mật khẩu',
      );
    }

    if (hoten.length > 100 || sodienthoai.length > 20) {
      throw new BadRequestException('Thông tin nhập quá dài');
    }

    if (!/^[0-9+()\-\s]{8,20}$/.test(sodienthoai)) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    if (matkhau.length < 8 || Buffer.byteLength(matkhau, 'utf8') > 72) {
      throw new BadRequestException(
        'Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte',
      );
    }

    const matkhauhash = await bcrypt.hash(matkhau, 12);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT makh FROM "taikhoankhachhang"
         WHERE sodienthoai = $1
            OR ($2::varchar IS NOT NULL AND lower(email) = $2)
         LIMIT 1`,
        [sodienthoai, email],
      );

      if (existing.rowCount) {
        throw new ConflictException(
          'Email hoặc số điện thoại đã được đăng ký',
        );
      }

      const result = await client.query(
        `INSERT INTO "taikhoankhachhang"
           (hoten, email, sodienthoai, matkhauhash, trangthai)
         VALUES ($1, $2, $3, $4, 0)
         RETURNING makh, hoten, email, sodienthoai, trangthai, ngaytao`,
        [hoten, email, sodienthoai, matkhauhash],
      );

      await client.query('COMMIT');

      return {
        message: 'Đăng ký thành công',
        user: result.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'Email hoặc số điện thoại đã được đăng ký',
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async dangNhap(data: { taikhoan: string; matkhau: string }) {
    const taikhoan = data.taikhoan?.trim();
    const matkhau = data.matkhau;

    if (!taikhoan || !matkhau) {
      throw new BadRequestException(
        'Vui lòng nhập email/số điện thoại và mật khẩu',
      );
    }

    const result = await this.pool.query(
      `SELECT makh, hoten, email, sodienthoai, matkhauhash, trangthai
       FROM "taikhoankhachhang"
       WHERE lower(email) = lower($1) OR sodienthoai = $1
       LIMIT 1`,
      [taikhoan],
    );

    if (!result.rowCount) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    const user = result.rows[0];

    if (user.trangthai === 1) {
      throw new ForbiddenException('Tài khoản đã bị khóa');
    }

    const isMatch = await bcrypt.compare(matkhau, user.matkhauhash);

    if (!isMatch) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không chính xác',
      );
    }

    // Trả thông tin tài khoản, tuyệt đối không trả mật khẩu hash.
    return {
      message: 'Đăng nhập thành công',
      user: {
        makh: user.makh,
        hoten: user.hoten,
        email: user.email,
        sodienthoai: user.sodienthoai,
        trangthai: user.trangthai,
      },
    };
  }
}