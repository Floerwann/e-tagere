-- DropIndex
DROP INDEX `Movie_userId_fkey` ON `movie`;

-- AddForeignKey
ALTER TABLE `Movie` ADD CONSTRAINT `Movie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
