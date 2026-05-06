-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionPlan" ADD VALUE 'ZEN_ENTREPRISE';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'PULSE_ENTREPRISE';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'BOOST_ENTREPRISE';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';
