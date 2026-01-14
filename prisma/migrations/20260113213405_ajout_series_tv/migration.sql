-- DropIndex
DROP INDEX `Movie_userId_fkey` ON `movie`;

-- DropIndex
DROP INDEX `Vinyl_userId_fkey` ON `vinyl`;

-- CreateTable
CREATE TABLE `TvShow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdbId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `posterPath` VARCHAR(191) NULL,
    `backdropPath` VARCHAR(191) NULL,
    `overview` TEXT NULL,
    `releaseDate` VARCHAR(191) NULL,
    `objectType` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NOT NULL,
    `includeBluray` BOOLEAN NOT NULL DEFAULT false,
    `includeDvd` BOOLEAN NOT NULL DEFAULT false,
    `isSteelbook` BOOLEAN NOT NULL DEFAULT false,
    `isSlipcover` BOOLEAN NOT NULL DEFAULT false,
    `edition` VARCHAR(191) NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Movie` ADD CONSTRAINT `Movie_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TvShow` ADD CONSTRAINT `TvShow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vinyl` ADD CONSTRAINT `Vinyl_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
