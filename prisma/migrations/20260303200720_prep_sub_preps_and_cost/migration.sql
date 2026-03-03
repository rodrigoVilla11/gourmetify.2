-- AlterTable
ALTER TABLE "preparations" ADD COLUMN     "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "preparation_sub_preps" (
    "preparationId" TEXT NOT NULL,
    "subPrepId" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "wastagePct" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "preparation_sub_preps_pkey" PRIMARY KEY ("preparationId","subPrepId")
);

-- AddForeignKey
ALTER TABLE "preparation_sub_preps" ADD CONSTRAINT "preparation_sub_preps_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "preparations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_sub_preps" ADD CONSTRAINT "preparation_sub_preps_subPrepId_fkey" FOREIGN KEY ("subPrepId") REFERENCES "preparations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
