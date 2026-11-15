import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Vui lòng đăng nhập để đặt hàng");
    }

    const token = authorization.slice(7);

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
      );
    }
  }
}
