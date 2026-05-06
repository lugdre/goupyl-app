-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ENTREPRISE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_name" TEXT;
