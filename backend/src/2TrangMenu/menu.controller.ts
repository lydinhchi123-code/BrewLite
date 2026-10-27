import { Controller, Get } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller()
export class MenuController {
constructor(private readonly menuService: MenuService) {}

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
}