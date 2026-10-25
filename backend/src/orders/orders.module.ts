import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
