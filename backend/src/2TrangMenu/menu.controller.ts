import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // API menu dành cho khách hàng
  @Get('products')
  async getProducts() {
    return this.menuService.getProducts();
  }

  @Get('menu/categories')
  async getCategories() {
    return this.menuService.getCategories();
  }

  @Get('menu/products')
  async getMenuProducts() {
    return this.menuService.getProducts();
  }

  // API Admin: xem toàn bộ sản phẩm và tình trạng tồn kho
  @Get('admin/inventory')
  async getInventory() {
    return this.menuService.getInventory();
  }

  // API Admin: cập nhật số lượng tồn kho
  @Patch('admin/inventory/:id')
  async updateInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { stockQuantity: number },
  ) {
    return this.menuService.updateInventory(id, body.stockQuantity);
  }
}