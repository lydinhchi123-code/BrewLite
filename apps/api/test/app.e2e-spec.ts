import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('BrewLite order flow (e2e)', () => {
  let app: INestApplication<App>;
  let customerToken: string;
  let customerPhone: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for API end-to-end tests.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('loads the menu, registers and signs in, creates an order, pays, and reads its confirmation', async () => {
    const health = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(health.body.status).toBe('ok');

    const menu = await request(app.getHttpServer())
      .get('/products')
      .expect(200);
    const cake = menu.body.find(
      (product: { categorySlug?: string }) =>
        product.categorySlug === 'banh',
    );
    expect(cake).toBeDefined();

    customerPhone = `098${Date.now().toString().slice(-7)}`;
    const password = 'BrewLiteE2e!2026';

    await request(app.getHttpServer())
      .post('/tai-khoan/dang-ky')
      .send({
        hoten: 'Khach Hang Thu Nghiem',
        sodienthoai: customerPhone,
        matkhau: password,
      })
      .expect((response) => {
        expect(response.status).toBe(201);
      });

    const login = await request(app.getHttpServer())
      .post('/tai-khoan/dang-nhap')
      .send({ taikhoan: customerPhone, matkhau: password })
      .expect(200);
    customerToken = login.body.accessToken;
    expect(customerToken).toEqual(expect.any(String));

    const price = Number(cake.basePrice);
    const createdOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deliveryMethod: 'PICKUP',
        items: [{ id: String(cake.id), name: cake.name, quantity: 1 }],
        customerName: 'Khach Hang Thu Nghiem',
        customerPhone,
        address: 'Nhận tại cửa hàng',
        phuong: 'Quận 5',
        subtotal: price,
        totalAmount: price,
      })
      .expect((response) => {
        if (response.status !== 201) {
          throw new Error(`Create order failed: ${JSON.stringify(response.body)}`);
        }
      });

    const orderId = createdOrder.body.orderId as string;
    const databaseOrderId = Number(createdOrder.body.order.madonhang);
    expect(orderId).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `e2e-${customerPhone}`)
      .send({
        madonhang: databaseOrderId,
        phuongthuc: 'MOMO',
        mockResult: 'SUCCESS',
      })
      .expect(201);

    const confirmation = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(confirmation.body).toMatchObject({
      orderId,
      orderStatus: 'PAID',
      paymentStatus: 'DA_THANH_TOAN',
      items: [expect.objectContaining({ name: cake.name, quantity: 1 })],
    });
  });
});
