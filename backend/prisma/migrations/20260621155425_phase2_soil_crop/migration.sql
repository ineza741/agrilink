/*
  Warnings:

  - You are about to drop the `auditlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `crophistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `farm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `farmerprofile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_actorUserId_fkey`;

-- DropForeignKey
ALTER TABLE `crophistory` DROP FOREIGN KEY `CropHistory_farmId_fkey`;

-- DropForeignKey
ALTER TABLE `farm` DROP FOREIGN KEY `Farm_farmerProfileId_fkey`;

-- DropForeignKey
ALTER TABLE `farmerprofile` DROP FOREIGN KEY `FarmerProfile_userId_fkey`;

-- DropTable
DROP TABLE `auditlog`;

-- DropTable
DROP TABLE `crophistory`;

-- DropTable
DROP TABLE `farm`;

-- DropTable
DROP TABLE `farmerprofile`;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'Farmer',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farmer_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `experienceLevel` VARCHAR(191) NOT NULL,
    `primaryCrop` VARCHAR(191) NOT NULL,
    `verificationStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `profileCompleteness` INTEGER NOT NULL DEFAULT 0,
    `reviewNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `farmer_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farms` (
    `id` VARCHAR(191) NOT NULL,
    `farmerProfileId` VARCHAR(191) NOT NULL,
    `farmName` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `farmSize` DOUBLE NOT NULL,
    `farmSizeUnit` VARCHAR(191) NOT NULL,
    `landType` VARCHAR(191) NOT NULL,
    `soilType` VARCHAR(191) NULL,
    `currentCrop` VARCHAR(191) NOT NULL,
    `cropStage` VARCHAR(191) NOT NULL,
    `ownershipType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crop_histories` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `cropName` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `yieldAmount` DOUBLE NULL,
    `yieldUnit` VARCHAR(191) NULL,
    `challenges` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soil_tests` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `ph` DOUBLE NOT NULL,
    `nitrogen` DOUBLE NOT NULL,
    `phosphorus` DOUBLE NOT NULL,
    `potassium` DOUBLE NOT NULL,
    `organicMatter` DOUBLE NOT NULL,
    `texture` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `analysisStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `regionContext` VARCHAR(191) NULL,
    `districtContext` VARCHAR(191) NULL,
    `sectorContext` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `analyzedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soil_lab_reports` (
    `id` VARCHAR(191) NOT NULL,
    `soilTestId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NULL,
    `storageMode` VARCHAR(191) NOT NULL DEFAULT 'demo-local',
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `soil_lab_reports_soilTestId_key`(`soilTestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crop_suitability_results` (
    `id` VARCHAR(191) NOT NULL,
    `soilTestId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `cropName` VARCHAR(191) NOT NULL,
    `suitabilityScore` INTEGER NOT NULL,
    `suitabilityBand` VARCHAR(191) NOT NULL,
    `recommendationSummary` VARCHAR(191) NOT NULL,
    `limitingFactors` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fertilizer_recommendations` (
    `id` VARCHAR(191) NOT NULL,
    `soilTestId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `nitrogenKgHa` DOUBLE NOT NULL,
    `phosphorusKgHa` DOUBLE NOT NULL,
    `potassiumKgHa` DOUBLE NOT NULL,
    `recommendedBlend` VARCHAR(191) NOT NULL,
    `applicationTiming` VARCHAR(191) NOT NULL,
    `budgetNote` VARCHAR(191) NULL,
    `recommendationSummary` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `farmer_profiles` ADD CONSTRAINT `farmer_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farms` ADD CONSTRAINT `farms_farmerProfileId_fkey` FOREIGN KEY (`farmerProfileId`) REFERENCES `farmer_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_histories` ADD CONSTRAINT `crop_histories_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soil_tests` ADD CONSTRAINT `soil_tests_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soil_lab_reports` ADD CONSTRAINT `soil_lab_reports_soilTestId_fkey` FOREIGN KEY (`soilTestId`) REFERENCES `soil_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_suitability_results` ADD CONSTRAINT `crop_suitability_results_soilTestId_fkey` FOREIGN KEY (`soilTestId`) REFERENCES `soil_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_suitability_results` ADD CONSTRAINT `crop_suitability_results_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fertilizer_recommendations` ADD CONSTRAINT `fertilizer_recommendations_soilTestId_fkey` FOREIGN KEY (`soilTestId`) REFERENCES `soil_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fertilizer_recommendations` ADD CONSTRAINT `fertilizer_recommendations_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
