--Tao Bang Don Hang
CREATE TABLE donhang (
    madh BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    makh BIGINT NOT NULL,
    ngaydat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trangthai VARCHAR(30) NOT NULL DEFAULT 'Chờ xác nhận',
    tongtien NUMERIC(12, 2) NOT NULL DEFAULT 0,
    FOREIGN KEY (makh)
        REFERENCES taikhoankhachhang(makh),
    CONSTRAINT chk_donhang_tongtien
        CHECK (tongtien >= 0)
);

--Tao Bang Chi Tiet Don Hang

CREATE TABLE chitietdonhang (
    mactdh BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    madh BIGINT NOT NULL,
    tenmon VARCHAR(255) NOT NULL,
    kichco VARCHAR(50),
    topping TEXT,
    soluong INTEGER NOT NULL,
    dongia NUMERIC(12, 2) NOT NULL,
    thanhtien NUMERIC(12, 2)
        GENERATED ALWAYS AS (soluong * dongia) STORED,

    FOREIGN KEY (madh)
        REFERENCES donhang(madh)
        ON DELETE CASCADE,

    CONSTRAINT chk_chitiet_soluong
        CHECK (soluong > 0),

    CONSTRAINT chk_chitiet_dongia
        CHECK (dongia >= 0)
);

