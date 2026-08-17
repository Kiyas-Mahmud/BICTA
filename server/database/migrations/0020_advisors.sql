-- Advisory panel shown on /about, grouped into three fixed tiers
-- (university / industry / core). Separate from `people` (judges, speakers):
-- advisors carry a different field set, belong to the organisation rather
-- than to an event, and are grouped by tier on a page of their own.
CREATE TABLE `advisors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`designation` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`photo_url` text,
	`linkedin_url` text,
	`category` text DEFAULT 'university' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `advisors_category_sort_idx` ON `advisors` (`category`,`sort_order`);
