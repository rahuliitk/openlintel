import { z } from 'zod';
import {
  categories, vendors, products, productPrices,
  eq, and, ilike, or,
} from '@openlintel/db';
import { router, protectedProcedure } from '../init';

export const catalogueRouter = router({
  // ── Product Queries ──────────────────────────────────────────
  listProducts: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      categoryId: z.string().optional(),
      vendorId: z.string().optional(),
      brand: z.string().optional(),
      material: z.string().optional(),
      status: z.string().optional(),
      sortBy: z.string().default('name'),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.categoryId) conditions.push(eq(products.categoryId, input.categoryId));
      if (input.vendorId) conditions.push(eq(products.vendorId, input.vendorId));
      if (input.brand) conditions.push(eq(products.brand, input.brand));
      if (input.material) conditions.push(eq(products.material, input.material));
      if (input.status) conditions.push(eq(products.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;

      const items = await ctx.db.query.products.findMany({
        where,
        limit: input.limit,
        offset,
        orderBy: (p, { asc, desc }) => {
          if (input.sortBy === 'price') return [asc(p.minPrice)];
          if (input.sortBy === 'created_at') return [desc(p.createdAt)];
          return [asc(p.name)];
        },
      });

      return { items, page: input.page, limit: input.limit };
    }),

  searchProducts: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.products.findMany({
        where: or(
          ilike(products.name, `%${input.query}%`),
          ilike(products.description, `%${input.query}%`),
        ),
        limit: input.limit,
      });

      return { items };
    }),

  getProduct: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
      });
      if (!product) throw new Error('Product not found');
      return product;
    }),

  // ── Product Mutations ────────────────────────────────────────
  createProduct: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      brand: z.string().optional(),
      category: z.string(),
      categoryId: z.string().optional(),
      subcategory: z.string().optional(),
      vendorId: z.string().optional(),
      sku: z.string().optional(),
      unit: z.string().default('piece'),
      material: z.string().optional(),
      finish: z.string().optional(),
      color: z.string().optional(),
      tags: z.array(z.string()).optional(),
      specifications: z.record(z.string(), z.unknown()).optional(),
      dimensions: z.object({
        length_mm: z.number().optional(),
        width_mm: z.number().optional(),
        height_mm: z.number().optional(),
      }).optional(),
      prices: z.array(z.object({
        vendor_id: z.string(),
        price: z.number(),
        currency: z.string().default('INR'),
        unit: z.string().default('piece'),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prices, ...productData } = input;

      const [product] = await ctx.db
        .insert(products)
        .values({
          ...productData,
          tags: productData.tags || [],
          specifications: productData.specifications || {},
          dimensions: productData.dimensions || null,
        })
        .returning();

      if (!product) throw new Error('Failed to create product');

      // Insert price entries if provided
      if (prices && prices.length > 0) {
        for (const p of prices) {
          await ctx.db.insert(productPrices).values({
            productId: product.id,
            vendorId: p.vendor_id,
            price: p.price,
            currency: p.currency,
            unit: p.unit,
          });
        }
      }

      return product;
    }),

  updateProduct: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      brand: z.string().optional(),
      category: z.string().optional(),
      material: z.string().optional(),
      finish: z.string().optional(),
      color: z.string().optional(),
      status: z.string().optional(),
      tags: z.array(z.string()).optional(),
      prices: z.array(z.object({
        vendor_id: z.string(),
        price: z.number(),
        currency: z.string().default('INR'),
        unit: z.string().default('piece'),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, prices, ...data } = input;

      const [updated] = await ctx.db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (!updated) throw new Error('Product not found');

      // If prices provided, upsert them
      if (prices && prices.length > 0) {
        for (const p of prices) {
          // Check if price entry already exists for this vendor
          const existing = await ctx.db.query.productPrices.findFirst({
            where: and(
              eq(productPrices.productId, id),
              eq(productPrices.vendorId, p.vendor_id),
            ),
          });

          if (existing) {
            await ctx.db
              .update(productPrices)
              .set({ price: p.price, currency: p.currency, unit: p.unit })
              .where(eq(productPrices.id, existing.id));
          } else {
            await ctx.db.insert(productPrices).values({
              productId: id,
              vendorId: p.vendor_id,
              price: p.price,
              currency: p.currency,
              unit: p.unit,
            });
          }
        }
      }

      return updated;
    }),

  deleteProduct: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(products)
        .where(eq(products.id, input.id))
        .returning();
      if (!deleted) throw new Error('Product not found');
      return { success: true, id: input.id };
    }),

  // ── Visual Search ────────────────────────────────────────────
  visualSearch: protectedProcedure
    .input(z.object({
      imageUrl: z.string().optional(),
      embedding: z.array(z.number()).optional(),
      limit: z.number().default(10),
    }))
    .mutation(async () => {
      // No vector DB available — return empty results
      return { items: [], message: 'Visual search is not available without a vector database.' };
    }),

  // ── Price Comparison ─────────────────────────────────────────
  compareProductPrices: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const priceEntries = await ctx.db.query.productPrices.findMany({
        where: eq(productPrices.productId, input.productId),
        with: { vendor: true },
        orderBy: (p, { asc }) => [asc(p.price)],
      });

      return { prices: priceEntries };
    }),

  // ── Category Queries & Mutations ─────────────────────────────
  listCategories: protectedProcedure
    .query(async ({ ctx }) => {
      const items = await ctx.db.query.categories.findMany({
        orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
      });
      return items;
    }),

  getCategoryTree: protectedProcedure
    .query(async ({ ctx }) => {
      const allCategories = await ctx.db.query.categories.findMany({
        orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
      });

      // Build tree structure in JS
      type TreeNode = typeof allCategories[number] & { children: TreeNode[] };
      const nodeMap = new Map<string, TreeNode>();
      const roots: TreeNode[] = [];

      for (const cat of allCategories) {
        nodeMap.set(cat.id, { ...cat, children: [] });
      }

      for (const cat of allCategories) {
        const node = nodeMap.get(cat.id)!;
        if (cat.parentId && nodeMap.has(cat.parentId)) {
          nodeMap.get(cat.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    }),

  createCategory: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      parentId: z.string().optional(),
      icon: z.string().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate a slug from the name
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const [category] = await ctx.db
        .insert(categories)
        .values({
          name: input.name,
          slug,
          description: input.description,
          parentId: input.parentId,
          icon: input.icon,
          imageUrl: input.imageUrl,
        })
        .returning();
      return category;
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updates: Record<string, any> = { ...data, updatedAt: new Date() };

      // Update slug if name changed
      if (data.name) {
        updates.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const [updated] = await ctx.db
        .update(categories)
        .set(updates)
        .where(eq(categories.id, id))
        .returning();
      if (!updated) throw new Error('Category not found');
      return updated;
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(categories)
        .where(eq(categories.id, input.id))
        .returning();
      if (!deleted) throw new Error('Category not found');
      return { success: true, id: input.id };
    }),

  // ── Vendor Queries & Mutations ───────────────────────────────
  listVendors: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const items = await ctx.db.query.vendors.findMany({
        limit,
        offset,
        orderBy: (v, { asc }) => [asc(v.name)],
      });

      return { items, page, limit };
    }),

  getVendor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const vendor = await ctx.db.query.vendors.findFirst({
        where: eq(vendors.id, input.id),
      });
      if (!vendor) throw new Error('Vendor not found');
      return vendor;
    }),

  createVendor: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string().optional(),
      description: z.string().optional(),
      website: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      gstNumber: z.string().optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [vendor] = await ctx.db
        .insert(vendors)
        .values({
          name: input.name,
          code: input.code,
          description: input.description,
          website: input.website,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          address: input.address,
          city: input.city,
          state: input.state,
          gstNumber: input.gstNumber,
          paymentTerms: input.paymentTerms,
        })
        .returning();
      return vendor;
    }),

  updateVendor: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      website: z.string().optional(),
      contactEmail: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(vendors)
        .set(data)
        .where(eq(vendors.id, id))
        .returning();
      if (!updated) throw new Error('Vendor not found');
      return updated;
    }),

  deleteVendor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(vendors)
        .where(eq(vendors.id, input.id))
        .returning();
      if (!deleted) throw new Error('Vendor not found');
      return { success: true, id: input.id };
    }),
});
