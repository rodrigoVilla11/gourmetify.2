import { z } from "zod";

export const UnitSchema = z.enum(["KG", "G", "L", "ML", "UNIT"]);
export const CurrencySchema = z.enum(["ARS", "EUR", "USD"]);
export const MovementTypeSchema = z.enum(["SALE", "ADJUSTMENT", "PURCHASE"]);
export const PaymentMethodSchema = z.enum([
  "EFECTIVO",
  "TRANSFERENCIA",
  "ONLINE",
  "DEBITO",
  "CREDITO",
  "RAPPI",
  "MERCADO_ENVIOS",
]);
export const PaymentTermsSchema = z.enum(["ON_DELIVERY", "IMMEDIATE", "CREDIT"]);
export const InvoiceStatusSchema = z.enum(["PENDING", "PARTIAL", "PAID"]);

// ── Suppliers ────────────────────────────────────────────────────────────────

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  paymentTerms: PaymentTermsSchema.default("ON_DELIVERY"),
  creditDays: z.coerce.number().int().min(0).default(0),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

// ── Ingredients ──────────────────────────────────────────────────────────────

export const CreateIngredientSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  unit: UnitSchema,
  onHand: z.coerce.number().min(0).default(0),
  minQty: z.coerce.number().min(0).default(0),
  costPerUnit: z.coerce.number().min(0).default(0),
  currency: CurrencySchema.default("ARS"),
  supplierId: z.string().cuid().optional().nullable(),
});

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

// ── Products + BOM ───────────────────────────────────────────────────────────

export const BOMItemSchema = z.object({
  ingredientId: z.string().cuid("ID de ingrediente inválido"),
  qty: z.coerce.number().positive("Cantidad debe ser positiva"),
  unit: UnitSchema,
  wastagePct: z.coerce.number().min(0).max(100).default(0),
});

export const ProductPreparationSchema = z.object({
  preparationId: z.string().cuid("ID de preparación inválido"),
  qty: z.coerce.number().positive("Cantidad debe ser positiva"),
  unit: UnitSchema,
  wastagePct: z.coerce.number().min(0).max(100).default(0),
});

export const CreateProductCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido").default("#6B7280"),
});

export const UpdateProductCategorySchema = CreateProductCategorySchema.partial();

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  sku: z.string().max(50).optional().nullable(),
  salePrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  currency: CurrencySchema.default("ARS"),
  categoryId: z.string().cuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  ingredients: z.array(BOMItemSchema).default([]),
  preparations: z.array(ProductPreparationSchema).default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ── Sales ────────────────────────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  productId: z.string().cuid("ID de producto inválido"),
  quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
});

export const SalePaymentSchema = z.object({
  paymentMethod: PaymentMethodSchema,
  amount: z.coerce.number().min(0, "Monto no puede ser negativo"),
});

export const SaleComboItemSchema = z.object({
  comboId: z.string().cuid("ID de combo inválido"),
  quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
});

export const CreateCustomerSchema = z.object({
  name:    z.string().min(1, "Nombre requerido").max(100),
  phone:   z.string().max(30).optional().nullable(),
  email:   z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  address: z.string().max(200).optional().nullable(),
  notes:   z.string().optional().nullable(),
});
export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const OrderTypeSchema = z.enum(["SALON", "TAKEAWAY", "DELIVERY"]);

export const CreateSaleSchema = z.object({
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
  customerId:   z.string().cuid().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  orderType:       OrderTypeSchema.default("SALON"),
  deliveryAddress: z.string().max(200).optional().nullable(),
  repartidorId:    z.string().optional().nullable(),
  items: z.array(SaleItemSchema).default([]),
  comboItems: z.array(SaleComboItemSchema).optional(),
  payments: z.array(SalePaymentSchema).optional(),
}).refine(
  (d) => d.items.length > 0 || (d.comboItems && d.comboItems.length > 0),
  { message: "Al menos un producto o combo requerido" }
);

export const PaySaleSchema = z.object({
  payments: z.array(z.object({
    paymentMethod: PaymentMethodSchema,
    amount:        z.coerce.number().min(0),
  })).min(1, "Al menos un método de pago requerido"),
  total:  z.coerce.number().positive().optional(),
  isPaid: z.boolean().default(true),
});

// ── Adjustments ──────────────────────────────────────────────────────────────

export const CreateAdjustmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ingredient"),
    ingredientId: z.string().cuid("ID de ingrediente inválido"),
    delta: z.coerce.number().refine((v) => v !== 0, "Delta no puede ser cero"),
    reason: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal("preparation"),
    preparationId: z.string().cuid("ID de preparación inválido"),
    delta: z.coerce.number().refine((v) => v !== 0, "Delta no puede ser cero"),
    reason: z.string().optional().nullable(),
  }),
]);

// ── Employees ────────────────────────────────────────────────────────────────

export const CreateEmployeeSchema = z.object({
  firstName:  z.string().min(1, "Nombre requerido").max(100),
  lastName:   z.string().min(1, "Apellido requerido").max(100),
  role:       z.string().max(50).optional().nullable(),
  hourlyRate: z.coerce.number().min(0).default(0),
  phone:      z.string().optional().nullable(),
  email:      z.string().email("Email inválido").optional().nullable().or(z.literal("")),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

// ── Time Logs ────────────────────────────────────────────────────────────────

export const CreateTimeLogSchema = z.object({
  employeeId: z.string().cuid("ID de empleado inválido"),
  notes:      z.string().optional().nullable(),
});

export const CheckOutSchema = z.object({
  employeeId: z.string().cuid("ID de empleado inválido"),
  notes:      z.string().optional().nullable(),
});

export const UpdateTimeLogSchema = z.object({
  checkIn:  z.string().optional(),
  checkOut: z.string().optional().nullable(),
  notes:    z.string().optional().nullable(),
});

// ── Income Entries ────────────────────────────────────────────────────────────

export const CreateIncomeEntrySchema = z.object({
  amount: z.coerce.number().positive("Monto requerido"),
  currency: CurrencySchema.default("ARS"),
  date: z.string().optional(),
  paymentMethod: PaymentMethodSchema,
  description: z.string().min(1, "Descripción requerida").max(200),
  notes: z.string().optional().nullable(),
});

export const UpdateIncomeEntrySchema = CreateIncomeEntrySchema.partial();

// ── Expense Categories ────────────────────────────────────────────────────────

export const CreateExpenseCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(80),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido (ej: #FF5733)")
    .default("#6B7280"),
});

export const UpdateExpenseCategorySchema = CreateExpenseCategorySchema.partial();

// ── Expenses ──────────────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  amount: z.coerce.number().positive("Monto requerido"),
  currency: CurrencySchema.default("ARS"),
  date: z.string().optional(),
  description: z.string().min(1, "Descripción requerida").max(200),
  categoryId: z.string().cuid().optional().nullable(),
  cashSessionId: z.string().cuid().optional().nullable(),
  paymentMethod: PaymentMethodSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

// ── Cash Sessions ─────────────────────────────────────────────────────────────

export const OpenCashSessionSchema = z.object({
  openingBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const CloseCashSessionSchema = z.object({
  closingBalance: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

// ── Supplier Invoices ─────────────────────────────────────────────────────────

export const CreateSupplierInvoiceSchema = z.object({
  supplierId: z.string().cuid("ID de proveedor inválido"),
  amount: z.coerce.number().positive("Monto requerido"),
  currency: CurrencySchema.default("ARS"),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  invoiceNumber: z.string().max(50).optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateSupplierInvoiceSchema = CreateSupplierInvoiceSchema
  .omit({ supplierId: true })
  .partial()
  .extend({ status: InvoiceStatusSchema.optional() });

// ── Supplier Payments ─────────────────────────────────────────────────────────

export const CreateSupplierPaymentSchema = z.object({
  supplierId: z.string().cuid("ID de proveedor inválido"),
  invoiceId: z.string().cuid().optional().nullable(),
  amount: z.coerce.number().positive("Monto requerido"),
  currency: CurrencySchema.default("ARS"),
  date: z.string().optional(),
  paymentMethod: PaymentMethodSchema,
  notes: z.string().optional().nullable(),
});

// ── Preparations ──────────────────────────────────────────────────────────────

export const PreparationIngredientSchema = z.object({
  ingredientId: z.string().cuid("ID de ingrediente inválido"),
  qty: z.coerce.number().positive("Cantidad debe ser positiva"),
  unit: UnitSchema,
  wastagePct: z.coerce.number().min(0).max(100).default(0),
});

export const PreparationSubPrepSchema = z.object({
  subPrepId: z.string().cuid("ID de preparación inválido"),
  qty: z.coerce.number().positive("Cantidad debe ser positiva"),
  unit: UnitSchema,
  wastagePct: z.coerce.number().min(0).max(100).default(0),
});

export const CreatePreparationSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  unit: UnitSchema,
  yieldQty: z.coerce.number().positive("Rendimiento debe ser positivo").default(1),
  wastagePct: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
  ingredients: z.array(PreparationIngredientSchema).default([]),
  subPreparations: z.array(PreparationSubPrepSchema).default([]),
});

export const UpdatePreparationSchema = CreatePreparationSchema.partial();

export const ProducePreparationSchema = z.object({
  batches: z.coerce.number().positive("La cantidad de tandas debe ser positiva").default(1),
  notes: z.string().optional().nullable(),
});

// ── Combos ────────────────────────────────────────────────────────────────────

export const ComboProductSchema = z.object({
  productId: z.string().cuid("ID de producto inválido"),
  quantity: z.coerce.number().positive("Cantidad debe ser positiva").default(1),
});

export const CreateComboSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  sku: z.string().max(50).optional().nullable(),
  salePrice: z.coerce.number().min(0).default(0),
  currency: CurrencySchema.default("ARS"),
  notes: z.string().optional().nullable(),
  products: z.array(ComboProductSchema).min(1, "Un combo requiere al menos 1 producto"),
});

export const UpdateComboSchema = CreateComboSchema.partial();

// ── Order Status ──────────────────────────────────────────────────────────────

export const OrderStatusSchema = z.enum(["NUEVO", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"]);

export const UpdateSaleStatusSchema = z.object({
  status: OrderStatusSchema,
  rollbackStock:    z.boolean().optional(),
  rollbackPayments: z.boolean().optional(),
});

// ── Users / Auth ───────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(["ADMIN", "ENCARGADO", "CAJERA", "EMPLEADO"]);

export const LoginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres").max(50),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: UserRoleSchema,
  employeeId: z.string().cuid().optional().nullable(),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres").max(50).optional(),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  employeeId: z.string().cuid().optional().nullable(),
});
