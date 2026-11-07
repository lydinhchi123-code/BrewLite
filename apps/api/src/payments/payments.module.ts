import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../database/database.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { VnpayService } from "./vnpay.service";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "30d" },
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayService],
})
export class PaymentsModule {}