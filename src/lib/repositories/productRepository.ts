import { ProductFormValues } from "@/app/dashboard/product-management/products/add/page";
import { QueryBuilder } from "../helpers/db-helper";
import { RepositoryBase } from "../helpers/repository-base";
import { File } from "fetch-blob/file.js";
import { deleteFileFromIdentifier, getFileUrl, saveFile } from "../helpers/file-helper";
import { FileRepository } from "./sys/fileRepository";

export interface Product {
  product_id: number;
  company_id: number;

  product_name: string;
  product_image: string;
  product_description: string;

  item_count: number;

  updated_by: number;
  creator_name: string;

  status: number;
  created_on: string;
  updated_on: string;
}

export class ProductRepository extends RepositoryBase {
  private companyId: string;

  constructor(comapanyId: string) {
    super();
    this.companyId = comapanyId;
  }

  async getProductList({
    status = 1,
    modifier = '=',
    count = true
  }: {
    status?: number,
    modifier?: string,
    count?: boolean
  }) {
    try {
      const builder = new QueryBuilder('products');

      builder.where(`status ${modifier} ?`, status);

      if (this.companyId) {
        builder.where(`company_id = ?`, this.companyId);
      }

      const res = await builder.select();

      if (res.length == 0) {
        return this.failure('No Categories Available!');
      }


      const fileRepo = new FileRepository(this.companyId)
      for (let i = 0; i < res.length; i++) {
        const product = res[i] as Product;
        if (count) {
        }
        const images = await fileRepo.getFileFromType(String(product.product_id), 'product_image');

        if (images.success) {
          const imageUrl = getFileUrl(images.result.identifier);
          product.product_image = imageUrl;
        }
      }

      return this.success(res);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getProductById({
    productId,
    count = true
  }: {
    productId: string
    count?: boolean
  }) {
    try {
      const builder = new QueryBuilder('products')
        .where('product_id = ?', productId);

      if (this.companyId) {
        builder.where(`company_id = ?`, this.companyId);
      }

      const res = await builder.selectOne() as Product;

      if (!res) {
        return this.failure('Invalid Product!');
      }

      if (count) {
        // for (let i = 0; i < res.length; i++) {
        //   const product = res[i];

        //   const count = await new QueryBuilder('')
        // }
      }

      const images = await new FileRepository(this.companyId).getFileFromType(String(productId), 'product_image');

      if (images.success) {
        const imageUrl = getFileUrl(images.result.identifier);
        res.product_image = imageUrl;
      }

      return this.success(res);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createProduct(
    userId: string,
    data: ProductFormValues,
  ) {
    try {
      const res = await new QueryBuilder('products')
        .insert({
          ...data,
          updated_by: userId,
          company_id: this.companyId,
          status: 1
        })

      if (res <= 0) {
        return this.failure('Something went wrong!')
      }

      return this.success({
        product_id: res
      }, 'Product Added!');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateProductImage(
    productId: string,
    userId: string,
    image: File,
  ) {
    try {
      await deleteFileFromIdentifier({ identifier: productId, associatedType: 'product_image', userId });

      const res = await saveFile(image, 'product_image', productId, 'product_image', './uploads/product', 'updateProductImage', 0, userId)

      return this.success(res, 'Product Image Updated!');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateProduct(
    productId: string,
    userId: string,
    data: ProductFormValues,
  ) {
    try {
      const res = await new QueryBuilder('products')
        .where('product_id = ?', productId)
        .update({
          ...data,
          updated_by: userId,
        })

      if (res <= 0) {
        return this.failure('Update Failed!')
      }

      return this.success('Product Updated!');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteProduct(
    productId: string,
  ) {
    try {
      const res = await new QueryBuilder('products')
        .where('product_id = ?', productId)
        .update({
          status: -1
        })

      if (res <= 0) {
        return this.failure('Update Failed!')
      }

      return this.success('Product Updated!');
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  async updateProductStatus(
    field: string,
    status: string,
    productId: string,
  ) {
    try {
      const res = await new QueryBuilder('products')
        .where('product_id = ?', productId)
        .update({
          [field]: status
        })

      if (res <= 0) {
        return this.failure('Update Failed!')
      }

      return this.success('Product Updated!');
    } catch (error) {
      return this.handleError(error);
    }
  }
}