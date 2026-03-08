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
  paymentMethod: z.string().min(1, "Método de pago requerido"),
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

export const OrderExtraSchema = z.object({
  extraId:  z.string(),
  quantity: z.coerce.number().int().positive(),
});

export const OrderDiscountSnapshotSchema = z.object({
  discountId:    z.string(),
  name:          z.string(),
  label:         z.string().optional().nullable(),
  discountType:  z.string(),
  value:         z.number(),
  amountApplied: z.number(),
});

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
  paymentAdjustmentType:   z.enum(["none", "discount", "surcharge"]).optional(),
  paymentAdjustmentPct:    z.coerce.number().min(0).max(100).optional(),
  paymentAdjustmentAmount: z.coerce.number().optional(),
  paymentMethodSnapshot:   z.any().optional(),
  selectedExtras:  z.array(OrderExtraSchema).optional().default([]),
  appliedDiscount: OrderDiscountSnapshotSchema.optional().nullable(),
  extrasAmount:    z.coerce.number().optional(),
  discountAmount:  z.coerce.number().optional(),
}).refine(
  (d) => d.items.length > 0 || (d.comboItems && d.comboItems.length > 0),
  { message: "Al menos un producto o combo requerido" }
);

export const PaySaleSchema = z.object({
  payments: z.array(z.object({
    paymentMethod: z.string().min(1),
    amount:        z.coerce.number().min(0),
  })).min(1, "Al menos un método de pago requerido"),
  total:  z.coerce.number().positive().optional(),
  isPaid: z.boolean().default(true),
  paymentAdjustmentType:   z.enum(["none", "discount", "surcharge"]).optional(),
  paymentAdjustmentPct:    z.coerce.number().min(0).max(100).optional(),
  paymentAdjustmentAmount: z.coerce.number().optional(),
  paymentMethodSnapshot:   z.any().optional(),
  discountAmount:          z.coerce.number().optional(),
  discountsSnapshot:       z.any().optional().nullable(),
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

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const PurchaseOrderStatusSchema = z.enum(["DRAFT", "SENT", "RECEIVED", "CANCELLED"]);

export const PurchaseOrderItemInputSchema = z.object({
  ingredientId: z.string().cuid("ID de ingrediente inválido"),
  ingredientNameSnapshot: z.string().min(1),
  unit: UnitSchema,
  expectedQty: z.coerce.number().positive("Cantidad debe ser positiva"),
  expectedUnitCost: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().cuid("Proveedor requerido"),
  items: z.array(PurchaseOrderItemInputSchema).min(1, "Agregá al menos un ingrediente"),
  notes: z.string().optional().nullable(),
  expectedDeliveryAt: z.string().optional().nullable(),
});

export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial();

export const UpdatePurchaseOrderStatusSchema = z.object({
  status: z.enum(["SENT", "CANCELLED"]),
});

export const ReceivePurchaseOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().cuid(),
    receivedQty: z.coerce.number().min(0),
    actualUnitCost: z.coerce.number().min(0),
  })).min(1),
  notes: z.string().optional().nullable(),
});

export const AddPurchaseOrderInvoiceSchema = z.object({
  fileUrl: z.string().url("URL inválida"),
  fileName: z.string().min(1),
  fileType: z.string().optional().nullable(),
});

// ── Order Status ──────────────────────────────────────────────────────────────

export const OrderStatusSchema = z.enum(["NUEVO", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"]);

export const UpdateSaleStatusSchema = z.object({
  status: OrderStatusSchema,
  rollbackPayments: z.boolean().optional(),
  cancelStockDecision: z.enum(["deduct", "skip"]).optional(),
  cancelCashDecision:  z.enum(["add", "skip"]).optional(),
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

// ── Discounts ─────────────────────────────────────────────────────────────────

const DiscountBaseSchema = z.object({
  name:          z.string().min(1, "Nombre requerido").max(255),
  description:   z.string().optional().nullable(),
  isActive:      z.boolean().default(true),
  discountType:  z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  value:         z.coerce.number().min(0, "Valor requerido"),
  priority:      z.coerce.number().int().min(0).default(0),
  label:         z.string().max(255).optional().nullable(),
  dateFrom:      z.string().optional().nullable(),
  dateTo:        z.string().optional().nullable(),
  timeFrom:      z.string().max(5).optional().nullable(),
  timeTo:        z.string().max(5).optional().nullable(),
  weekdays:      z.array(z.number().int().min(0).max(6)).optional().nullable(),
  appliesTo:     z.enum(["ORDER", "PRODUCTS", "CATEGORIES"]).default("ORDER"),
  productIds:    z.array(z.string()).optional().nullable(),
  categoryIds:   z.array(z.string()).optional().nullable(),
  paymentMethods: z.array(z.string()).optional().nullable(),
  sortOrder:     z.coerce.number().int().min(0).default(0),
});

export const CreateDiscountSchema = DiscountBaseSchema.superRefine((data, ctx) => {
  if (data.discountType === "PERCENTAGE" && data.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El porcentaje de descuento no puede superar 100%", path: ["value"] });
  }
  if (data.dateFrom && data.dateTo && new Date(data.dateFrom) > new Date(data.dateTo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha desde debe ser anterior a la fecha hasta", path: ["dateFrom"] });
  }
});

export const UpdateDiscountSchema = DiscountBaseSchema.partial();

// ── Extras ────────────────────────────────────────────────────────────────────

export const CreateExtraSchema = z.object({
  name:          z.string().min(1, "Nombre requerido").max(255),
  description:   z.string().optional().nullable(),
  isActive:      z.boolean().default(true),
  price:         z.coerce.number().min(0).default(0),
  isFree:        z.boolean().default(false),
  affectsStock:  z.boolean().default(false),
  ingredientId:  z.string().optional().nullable(),
  ingredientQty: z.coerce.number().positive().optional().nullable(),
  appliesTo:     z.enum(["ALL", "PRODUCTS", "CATEGORIES"]).default("ALL"),
  productIds:    z.array(z.string()).optional().nullable(),
  categoryIds:   z.array(z.string()).optional().nullable(),
  maxQuantity:   z.coerce.number().int().positive().optional().nullable(),
  sortOrder:     z.coerce.number().int().min(0).default(0),
});

export const UpdateExtraSchema = CreateExtraSchema.partial();
