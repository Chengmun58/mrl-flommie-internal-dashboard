CREATE TABLE `dashboard_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotKey` varchar(128) NOT NULL,
	`version` varchar(32) NOT NULL,
	`sourceReadAtMs` bigint NOT NULL,
	`resultsAsOf` varchar(10) NOT NULL,
	`stockAsOf` varchar(10) NOT NULL,
	`snapshotJson` longtext NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dashboard_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_snapshots_snapshotKey_unique` UNIQUE(`snapshotKey`)
);
--> statement-breakpoint
CREATE TABLE `evidence_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(700) NOT NULL,
	`storageUrl` varchar(800) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`business` varchar(32) NOT NULL,
	`area` varchar(80) NOT NULL,
	`evidenceLabel` varchar(180) NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`uploadedByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_files_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
