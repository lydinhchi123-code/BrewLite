import { Module } from "@nestjs/common";
import { createObserveModule } from "@nestjs/observe";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MenuController } from "./2TrangMenu/menu.controller";
import { MenuService } from "./2TrangMenu/menu.service";
import { TaiKhoanController } from "./tai-khoan/tai-khoan.controller";
import { TaiKhoanService } from "./tai-khoan/tai-khoan.service";
import { JwtModule } from "@nestjs/jwt";
import { OrdersModule } from "./orders/orders.module";
import { DonHangController } from "./don_hang/don_hang.controller";
import { DonHangService } from "./don_hang/don_hang.service";

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: "YOUR_APP_KEY",
      appSecret: "YOUR_APP_SECRET",
      serviceId: "backend",
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
    OrdersModule,
  ],
  controllers: [
    AppController,
    MenuController,
    TaiKhoanController,
    DonHangController,
  ],
  providers: [AppService, MenuService, TaiKhoanService, DonHangService],
})
export class AppModule {}
