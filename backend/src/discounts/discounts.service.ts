import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';

import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  // Danh sách mã đang hoạt động dành cho khách hàng
  async findAll() {
    const result = await this.pool.query(
      `
      SELECT
        id,
        ma,
        ten,
        mo_ta,
        loai_ma,
        so_tien_giam,
        don_hang_toi_thieu,
        so_luong_toi_da,
        so_luong_da_dung,
        ngay_bat_dau,
        ngay_ket_thuc,
        trang_thai,
        moi_khach_mot_lan
      FROM magiamgia
      WHERE trang_thai = 'DANG_SU_DUNG'
        AND CURRENT_TIMESTAMP BETWEEN ngay_bat_dau AND ngay_ket_thuc
        AND (
          so_luong_toi_da IS NULL
          OR so_luong_da_dung < so_luong_toi_da
        )
      ORDER BY ngay_tao DESC
      `,
    );

    return result.rows;
  }

  // Danh sách tất cả mã dành cho giao diện quản trị
  async findAllForAdmin() {
    const result = await this.pool.query(
      `
      SELECT *
      FROM magiamgia
      ORDER BY ngay_tao DESC
      `,
    );

    return result.rows;
  }

  // Chi tiết mã giảm giá
  async findOne(ma: string) {
    const result = await this.pool.query(
      `
      SELECT *
      FROM magiamgia
      WHERE UPPER(ma) = UPPER($1)
      LIMIT 1
      `,
      [ma.trim()],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    return result.rows[0];
  }

  // Tạo mã giảm giá
  async create(dto: CreateDiscountDto) {
    const ma = dto.ma.trim().toUpperCase();

    if (new Date(dto.ngay_ket_thuc) <= new Date(dto.ngay_bat_dau)) {
      throw new BadRequestException(
        'Ngày kết thúc phải sau ngày bắt đầu',
      );
    }

    if (
      dto.so_luong_toi_da !== undefined &&
      dto.so_luong_toi_da < 1
    ) {
      throw new BadRequestException(
        'Số lượng mã phải lớn hơn 0',
      );
    }

    const result = await this.pool.query(
      `
      INSERT INTO magiamgia (
        ma,
        ten,
        mo_ta,
        loai_ma,
        so_tien_giam,
        don_hang_toi_thieu,
        so_luong_toi_da,
        ngay_bat_dau,
        ngay_ket_thuc,
        trang_thai,
        moi_khach_mot_lan
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        'DANG_SU_DUNG', $10
      )
      RETURNING *
      `,
      [
        ma,
        dto.ten.trim(),
        dto.mo_ta ?? null,
        dto.loai_ma,
        dto.so_tien_giam,
        dto.don_hang_toi_thieu ?? 0,
        dto.so_luong_toi_da ?? null,
        dto.ngay_bat_dau,
        dto.ngay_ket_thuc,
        dto.moi_khach_mot_lan ?? true,
      ],
    );

    return {
      message: 'Tạo mã giảm giá thành công',
      data: result.rows[0],
    };
  }

  // Cập nhật mã giảm giá
  async update(id: string, dto: UpdateDiscountDto) {
    const currentResult = await this.pool.query(
      `SELECT * FROM magiamgia WHERE id = $1`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const current = currentResult.rows[0];

    const ngayBatDau =
      dto.ngay_bat_dau ?? current.ngay_bat_dau;

    const ngayKetThuc =
      dto.ngay_ket_thuc ?? current.ngay_ket_thuc;

    if (new Date(ngayKetThuc) <= new Date(ngayBatDau)) {
      throw new BadRequestException(
        'Ngày kết thúc phải sau ngày bắt đầu',
      );
    }

    if (
      dto.so_luong_toi_da !== undefined &&
      dto.so_luong_toi_da !== null &&
      dto.so_luong_toi_da < current.so_luong_da_dung
    ) {
      throw new BadRequestException(
        'Số lượng tối đa không được nhỏ hơn số lượng đã sử dụng',
      );
    }

    const fields: Record<string, any> = {
      ma: dto.ma?.trim().toUpperCase(),
      ten: dto.ten?.trim(),
      mo_ta: dto.mo_ta,
      loai_ma: dto.loai_ma,
      so_tien_giam: dto.so_tien_giam,
      don_hang_toi_thieu: dto.don_hang_toi_thieu,
      so_luong_toi_da: dto.so_luong_toi_da,
      ngay_bat_dau: dto.ngay_bat_dau,
      ngay_ket_thuc: dto.ngay_ket_thuc,
      moi_khach_mot_lan: dto.moi_khach_mot_lan,
      trang_thai: dto.trang_thai,
    };

    const updates: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [column, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${column} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (updates.length === 0) {
      return {
        message: 'Không có thông tin cần cập nhật',
        data: current,
      };
    }

    values.push(id);

    const result = await this.pool.query(
      `
      UPDATE magiamgia
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
      `,
      values,
    );

    return {
      message: 'Cập nhật mã giảm giá thành công',
      data: result.rows[0],
    };
  }

  // Ẩn mã giảm giá
  async hide(id: string) {
    const result = await this.pool.query(
      `
      UPDATE magiamgia
      SET trang_thai = 'AN'
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    return {
      message: 'Ẩn mã giảm giá thành công',
      data: result.rows[0],
    };
  }

  // Ẩn/hiện mã giảm giá
  async toggleStatus(id: string) {
    const currentResult = await this.pool.query(
      `SELECT * FROM magiamgia WHERE id = $1`,
      [id],
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const currentStatus = currentResult.rows[0].trang_thai;

    if (currentStatus === 'HET') {
      throw new BadRequestException(
        'Mã giảm giá đã hết lượt sử dụng, không thể kích hoạt lại',
      );
    }

    const newStatus =
      currentStatus === 'AN' ? 'DANG_SU_DUNG' : 'AN';

    const result = await this.pool.query(
      `
      UPDATE magiamgia
      SET trang_thai = $1
      WHERE id = $2
      RETURNING *
      `,
      [newStatus, id],
    );

    return {
      message:
        newStatus === 'AN'
          ? 'Ẩn mã giảm giá thành công'
          : 'Hiện mã giảm giá thành công',
      data: result.rows[0],
    };
  }

  // Kiểm tra điều kiện sử dụng mã
  async checkDiscount(
    ma: string,
    makh: number,
    tamTinh: number,
  ) {
    const customerResult = await this.pool.query(
      `
      SELECT makh
      FROM taikhoankhachhang
      WHERE makh = $1
        AND trangthai = 0
      `,
      [makh],
    );

    if (customerResult.rows.length === 0) {
      throw new BadRequestException(
        'Tài khoản không tồn tại hoặc đã bị khóa',
      );
    }

    const discountResult = await this.pool.query(
      `
      SELECT *
      FROM magiamgia
      WHERE UPPER(ma) = UPPER($1)
      LIMIT 1
      `,
      [ma.trim()],
    );

    if (discountResult.rows.length === 0) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    const discount = discountResult.rows[0];

    if (discount.trang_thai !== 'DANG_SU_DUNG') {
      throw new BadRequestException(
        'Mã giảm giá hiện không hoạt động',
      );
    }

    const now = new Date();
    const start = new Date(discount.ngay_bat_dau);
    const end = new Date(discount.ngay_ket_thuc);

    if (now < start || now > end) {
      throw new BadRequestException(
        'Mã giảm giá chưa đến thời gian hoặc đã hết hạn',
      );
    }

    if (
      discount.so_luong_toi_da !== null &&
      Number(discount.so_luong_da_dung) >=
        Number(discount.so_luong_toi_da)
    ) {
      throw new BadRequestException(
        'Mã giảm giá đã hết lượt sử dụng',
      );
    }

    if (tamTinh < Number(discount.don_hang_toi_thieu)) {
      throw new BadRequestException(
        `Đơn hàng phải đạt tối thiểu ${discount.don_hang_toi_thieu}đ`,
      );
    }

    // Kiểm tra khách đã sử dụng mã này chưa
    const usedResult = await this.pool.query(
      `
      SELECT 1
      FROM lich_su_su_dung_ma_giam_gia
      WHERE ma_giam_gia_id = $1
        AND makh = $2
      LIMIT 1
      `,
      [discount.id, makh],
    );

    if (usedResult.rows.length > 0) {
      throw new BadRequestException(
        'Bạn đã sử dụng mã giảm giá này',
      );
    }

    // Mã dành cho khách hàng mới
    if (discount.loai_ma === 'NEW_CUSTOMER') {
      const orderResult = await this.pool.query(
        `
        SELECT 1
        FROM donhang
        WHERE makh = $1
          AND trangthai IN (
            'PAID',
            'PREPARING',
            'READY',
            'COMPLETED'
          )
        LIMIT 1
        `,
        [makh],
      );

      if (orderResult.rows.length > 0) {
        throw new BadRequestException(
          'Mã này chỉ dành cho khách hàng mới',
        );
      }
    }

    const soTienGiam = Math.min(
      Number(discount.so_tien_giam),
      tamTinh,
    );

    return {
      message: 'Mã giảm giá hợp lệ',
      data: {
        id: discount.id,
        ma: discount.ma,
        ten: discount.ten,
        loai_ma: discount.loai_ma,
        so_tien_giam: soTienGiam,
        tam_tinh: tamTinh,
        tong_tien_sau_giam: tamTinh - soTienGiam,
      },
    };
  }

  // Lịch sử sử dụng mã giảm giá
  async getHistory(id: string) {
    const discountResult = await this.pool.query(
      `SELECT id, ma, ten FROM magiamgia WHERE id = $1`,
      [id],
    );

    if (discountResult.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const result = await this.pool.query(
      `
      SELECT
        ls.ma_giam_gia_id,
        ls.makh,
        kh.hoten,
        kh.email,
        kh.sodienthoai,
        ls.madonhang,
        dh.madonhanghienthi,
        ls.so_tien_duoc_giam,
        ls.ngay_su_dung
      FROM lich_su_su_dung_ma_giam_gia ls
      LEFT JOIN taikhoankhachhang kh
        ON kh.makh = ls.makh
      LEFT JOIN donhang dh
        ON dh.madonhang = ls.madonhang
      WHERE ls.ma_giam_gia_id = $1
      ORDER BY ls.ngay_su_dung DESC
      `,
      [id],
    );

    return {
      discount: discountResult.rows[0],
      total: result.rows.length,
      history: result.rows,
    };
  }
}