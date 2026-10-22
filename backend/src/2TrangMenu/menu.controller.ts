import { Controller, Get } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('categories')
  async getCategories(): Promise<
    Awaited<ReturnType<MenuService['getCategories']>>
  > {
    return this.menuService.getCategories();
  }

  @Get('products')
  async getProducts(): Promise<
    Awaited<ReturnType<MenuService['getProducts']>>
  > {
    return this.menuService.getProducts();
  }
}
