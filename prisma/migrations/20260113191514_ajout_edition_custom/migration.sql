-- DropIndex
DROP INDEX `Movie_userId_fkey` ON `movie`;

-- DropIndex
DROP INDEX `Vinyl_userId_fkey` ON `vinyl`;

-- AlterTable
ALTER TABLE `movie` ADD COLUMN `edition` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Movie` ADD CONSTRAINT `Movie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vinyl` ADD CONSTRAINT `Vinyl_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
