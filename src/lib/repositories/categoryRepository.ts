import { QueryBuilder } from "../helpers/db-helper";
import { RepositoryBase } from "../helpers/repository-base";

export interface Category {
  category_id: number;
  company_id: number;

  category_name: string;
  category_description: string;

  item_count: number;

  updated_by: number;
  creator_name: string;

  status: number;
  created_on: string;
  updated_on: string;
}

export class CategoryRepository extends RepositoryBase {
  private companyId: string;

  constructor(comapanyId: string) {
    super();
    this.companyId = comapanyId;
  }

  async getCategoryList({
    status = 1,
    modifier = '=',
    count = true
  }: {
    status?: number,
    modifier?: string,
    count?: boolean
  }) {
    try {
      const builder = new QueryBuilder('categories');

      if (status) {
        builder.where(`status ${modifier} ?`, status);
      }

      if (this.companyId) {
        builder.where(`company_id = ?`, this.companyId);
      }

      const res = await builder.select();

      if (res.length == 0) {
        return this.failure('No Categories Available!');
      }

      if (count) {
        // for (let i = 0; i < res.length; i++) {
        //   const category = res[i];

        //   const count = await new QueryBuilder('')
        // }
      }

      return this.success(res);
    } catch (error) {
      return this.handleError(error);
    }
  }
}