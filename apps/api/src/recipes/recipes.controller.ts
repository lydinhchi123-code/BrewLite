import { Controller, Get, Param } from '@nestjs/common';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  // Lấy toàn bộ công thức của một món
  @Get('products/:productId')
  getByProduct(@Param('productId') productId: string) {
    return this.recipesService.getByProduct(Number(productId));
  }
}