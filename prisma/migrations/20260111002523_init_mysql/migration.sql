-- CreateTable
CREATE TABLE `Movie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tmdbId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `posterPath` VARCHAR(191) NULL,
    `format` VARCHAR(191) NOT NULL,
    `releaseDate` VARCHAR(191) NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Movie_tmdbId_key`(`tmdbId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
