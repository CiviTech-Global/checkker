-- AlterTable
ALTER TABLE "users" ADD COLUMN     "guest_device_id" VARCHAR(64),
ADD COLUMN     "is_guest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "wallet_address" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_guest_device_id_key" ON "users"("guest_device_id");
