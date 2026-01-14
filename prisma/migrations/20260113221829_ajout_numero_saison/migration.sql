-- DropIndex
DROP INDEX `Movie_userId_fkey` ON `movie`;

-- DropIndex
DROP INDEX `TvShow_userId_fkey` ON `tvshow`;

-- DropIndex
DROP INDEX `Vinyl_userId_fkey` ON `vinyl`;

-- AlterTable
ALTER TABLE `tvshow` ADD COLUMN `seasonNumber` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Movie` ADD CONSTRAINT `Movie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TvShow` ADD CONSTRAINT `TvShow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vinyl` ADD CONSTRAINT `Vinyl_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
