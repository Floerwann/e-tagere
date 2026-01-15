/*
  Warnings:

  - You are about to drop the column `discogsId` on the `vinyl` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `vinyl` table. All the data in the column will be lost.
  - Added the required column `format` to the `Vinyl` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Movie_userId_fkey` ON `movie`;

-- DropIndex
DROP INDEX `TvShow_userId_fkey` ON `tvshow`;

-- DropIndex
DROP INDEX `Vinyl_userId_fkey` ON `vinyl`;

-- AlterTable
ALTER TABLE `vinyl` DROP COLUMN `discogsId`,
    DROP COLUMN `year`,
    ADD COLUMN `catalogNumber` VARCHAR(191) NULL,
    ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `condition` VARCHAR(191) NULL,
    ADD COLUMN `edition` VARCHAR(191) NULL,
    ADD COLUMN `format` VARCHAR(191) NOT NULL,
    ADD COLUMN `label` VARCHAR(191) NULL,
    ADD COLUMN `originalYear` VARCHAR(191) NULL,
    ADD COLUMN `pressingYear` VARCHAR(191) NULL,
    ADD COLUMN `rpm` VARCHAR(191) NULL,
    ADD COLUMN `tmdbId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Movie` ADD CONSTRAINT `Movie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TvShow` ADD CONSTRAINT `TvShow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vinyl` ADD CONSTRAINT `Vinyl_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
