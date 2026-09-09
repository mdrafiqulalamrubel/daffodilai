CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_time` ON `audit` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`record_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `files_tenant_record` ON `files` (`tenant_id`,`record_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`reference` text NOT NULL,
	`request_key` text NOT NULL,
	`submitted_by` text,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`sector` text NOT NULL,
	`product` text NOT NULL,
	`intent` text NOT NULL,
	`stage` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT 'Unassigned' NOT NULL,
	`due` text NOT NULL,
	`source` text NOT NULL,
	`consent` integer NOT NULL,
	`marketing` integer DEFAULT 0 NOT NULL,
	`photo_consent` integer DEFAULT 0 NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`details` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_request_key` ON `leads` (`tenant_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `leads_tenant_created` ON `leads` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_submitted` ON `leads` (`submitted_by`);--> statement-breakpoint
CREATE INDEX `leads_tenant_stage` ON `leads` (`tenant_id`,`stage`);--> statement-breakpoint
CREATE INDEX `leads_contact` ON `leads` (`tenant_id`,`email`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_tenant_email` ON `memberships` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `members_email` ON `memberships` (`email`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`external_id` text,
	`error` text,
	`locked_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_lead` ON `outbox` (`tenant_id`,`lead_id`);--> statement-breakpoint
CREATE INDEX `outbox_tenant` ON `outbox` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `records_tenant_kind` ON `records` (`tenant_id`,`kind`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`brand` text DEFAULT 'Daffodil AI' NOT NULL,
	`created_at` text NOT NULL
);
