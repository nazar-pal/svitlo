CREATE TYPE "public"."generator_type" AS ENUM('diesel', 'gasoline', 'natural_gas', 'propane', 'dual_fuel', 'solar', 'inverter');--> statement-breakpoint
ALTER TABLE "generators" RENAME COLUMN "name" TO "title";--> statement-breakpoint
ALTER TABLE "generators" ALTER COLUMN "generator_type" SET DATA TYPE "public"."generator_type" USING "generator_type"::"public"."generator_type";--> statement-breakpoint
ALTER TABLE "generators" ADD COLUMN "model" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD COLUMN "is_one_time" boolean DEFAULT false NOT NULL;