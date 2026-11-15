import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class RecipesService {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  async getByProduct(productId: number) {
    // 1. Lấy danh sách công thức và nguyên liệu
    const result = await this.pool.query(
      `
      SELECT
        r.id AS recipe_id,
        r.product_id,
        r.name AS recipe_name,
        r.version,
        r.notes,
        r.preparation_time,
        r.is_active,

        s.id AS size_id,
        s.size_code,
        s.display_order,

        rd.id AS detail_id,
        rd.quantity,
        rd.unit,
        rd.notes AS ingredient_note,

        i.id AS ingredient_id,
        i.name AS ingredient_name

      FROM recipes r

      LEFT JOIN menu_product_sizes s
        ON s.id = r.size_id

      LEFT JOIN recipe_details rd
        ON rd.recipe_id = r.id

      LEFT JOIN ingredients i
        ON i.id = rd.ingredient_id

      WHERE r.product_id = $1
        AND r.is_active = TRUE

      ORDER BY
        s.display_order NULLS FIRST,
        r.version DESC,
        rd.id ASC
      `,
      [productId],
    );

    const recipesMap = new Map<number, any>();

    for (const row of result.rows) {
      if (!recipesMap.has(row.recipe_id)) {
        recipesMap.set(row.recipe_id, {
          recipeId: row.recipe_id,
          productId: row.product_id,
          recipeName: row.recipe_name,
          version: row.version,
          notes: row.notes,
          preparationTime: row.preparation_time,
          sizeId: row.size_id,
          sizeCode: row.size_code,
          ingredients: [],
          steps: [],
        });
      }

      if (row.ingredient_id !== null) {
        recipesMap.get(row.recipe_id).ingredients.push({
          ingredientId: row.ingredient_id,
          ingredientName: row.ingredient_name,
          quantity: Number(row.quantity),
          unit: row.unit,
          note: row.ingredient_note,
        });
      }
    }

    // 2. Lấy các bước thực hiện của từng công thức
    const recipeIds = Array.from(recipesMap.keys());

    if (recipeIds.length > 0) {
      const stepsResult = await this.pool.query(
        `
        SELECT
          recipe_id,
          step_number,
          instruction
        FROM recipe_steps
        WHERE recipe_id = ANY($1::BIGINT[])
        ORDER BY recipe_id, step_number
        `,
        [recipeIds],
      );

      // 3. Gắn từng bước vào đúng công thức
      for (const row of stepsResult.rows) {
        const recipe = recipesMap.get(row.recipe_id);

        if (recipe) {
          recipe.steps.push({
            stepNumber: row.step_number,
            instruction: row.instruction,
          });
        }
      }
    }

    return {
      data: Array.from(recipesMap.values()),
    };
  }
}