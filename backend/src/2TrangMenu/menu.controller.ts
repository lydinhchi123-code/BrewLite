import { Controller, Get } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller()
export class MenuController {
constructor(private readonly menuService: MenuService) {}

// Task 2: GET /products
@Get('products')
async getProducts() {
return this.menuService.getProducts();
}

// API danh sách danh mục hiện tại
@Get('menu/categories')
async getCategories() {
return this.menuService.getCategories();
}

// API sản phẩm cũ, giữ để frontend không bị lỗi
@Get('menu/products')
async getMenuProducts() {
return this.menuService.getProducts();
}
}