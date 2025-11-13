/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `socialId` on the `User` table. All the data in the column will be lost.
  - Added the required column `provider_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_socialId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "socialId",
ADD COLUMN     "password" VARCHAR(50),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "provider_id" VARCHAR(50) NOT NULL;

-- DropEnum
DROP TYPE "Role";
