-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'AMBASSADOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApartmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'PENTHOUSE', 'STUDIO');

-- CreateEnum
CREATE TYPE "HowToContact" AS ENUM ('PHONE', 'WHATSAPP', 'BOTH');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('NEDARIM_PLUS', 'STRIPE', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('RENT', 'SWAP');

-- CreateEnum
CREATE TYPE "AmbassadorStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AmbassadorModel" AS ENUM ('MODEL_A', 'MODEL_B');

-- CreateEnum
CREATE TYPE "AttributionMethod" AS ENUM ('LINK', 'MANUAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "AttributionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('LISTING', 'RENTAL', 'SUB_REFERRAL', 'REVERSAL');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "ambassadors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "referral_code" TEXT,
    "default_model" "AmbassadorModel" NOT NULL DEFAULT 'MODEL_A',
    "recruited_by_id" TEXT,
    "status" "AmbassadorStatus" NOT NULL DEFAULT 'PENDING',
    "rates" JSONB,
    "rate_locked_until" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "contract_signed_at" TIMESTAMP(3),
    "payout_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassadors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambassador_attributions" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT,
    "ambassador_id" TEXT NOT NULL,
    "apartment_title" TEXT NOT NULL,
    "owner_name" TEXT,
    "owner_phone" TEXT NOT NULL,
    "owner_email" TEXT,
    "model" "AmbassadorModel",
    "model_set_at" TIMESTAMP(3),
    "model_deadline" TIMESTAMP(3) NOT NULL,
    "method" "AttributionMethod" NOT NULL DEFAULT 'LINK',
    "status" "AttributionStatus" NOT NULL DEFAULT 'ACTIVE',
    "attributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listing_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambassador_commissions" (
    "id" TEXT NOT NULL,
    "ambassador_id" TEXT NOT NULL,
    "type" "CommissionType" NOT NULL,
    "source_listing_id" TEXT,
    "source_rental_id" TEXT,
    "apartment_title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "payout_id" TEXT,
    "reversal_of" TEXT,
    "reversal_reason" TEXT,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambassador_payouts" (
    "id" TEXT NOT NULL,
    "ambassador_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "reference_code" TEXT,
    "rejection_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekend_calendars" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekend_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartments" (
    "id" TEXT NOT NULL,
    "property_id" TEXT,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "neithborhood" TEXT NOT NULL,
    "street1" TEXT,
    "street2" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "property_type" "PropertyType" NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "max_guest" INTEGER NOT NULL,
    "price_per_shabbat" DOUBLE PRECISION NOT NULL,
    "neighborhood_wolking_time" TIMESTAMP(3),
    "amenities" TEXT[],
    "cover_image" TEXT,
    "images" TEXT[],
    "phone_number" TEXT,
    "whats_app" TEXT,
    "how_to_contact" "HowToContact" NOT NULL DEFAULT 'BOTH',
    "additional_details" TEXT,
    "status" "ApartmentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment_availabilities" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "weekend_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartment_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_rented" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "target_apartment_id" TEXT,
    "report_type" "ReportType" NOT NULL DEFAULT 'RENT',
    "weekend" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_rented_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_preferences" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "neighborhood" TEXT,
    "rooms" INTEGER,
    "beds" INTEGER,
    "weekend" TIMESTAMP(3),
    "whats_app" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swaps" (
    "id" TEXT NOT NULL,
    "from_app_id" TEXT NOT NULL,
    "to_app_id" TEXT NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "swap_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment_listing_payments" (
    "id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'NEDARIM_PLUS',
    "transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartment_listing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_rented_payments" (
    "id" TEXT NOT NULL,
    "report_rented_id" TEXT,
    "apartment_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'NEDARIM_PLUS',
    "transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_rented_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_payments" (
    "id" TEXT NOT NULL,
    "swap_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'NEDARIM_PLUS',
    "transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notify_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notify_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interested_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interested_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "shabbos_id" TEXT,
    "appartment_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "original_price" DOUBLE PRECISION NOT NULL,
    "offer_price" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "apartment_id" TEXT,
    "twilio_call_sid" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "profile_image" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "otp" INTEGER,
    "otp_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_emails" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ambassadors_email_key" ON "ambassadors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ambassadors_phone_key" ON "ambassadors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ambassadors_referral_code_key" ON "ambassadors"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "ambassador_attributions_apartment_id_key" ON "ambassador_attributions"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekend_calendars_title_key" ON "weekend_calendars"("title");

-- CreateIndex
CREATE UNIQUE INDEX "weekend_calendars_date_key" ON "weekend_calendars"("date");

-- CreateIndex
CREATE UNIQUE INDEX "apartments_property_id_key" ON "apartments"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartments_user_id_key" ON "apartments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_availabilities_apartment_id_weekend_id_key" ON "apartment_availabilities"("apartment_id", "weekend_id");

-- CreateIndex
CREATE UNIQUE INDEX "swap_preferences_apartment_id_key" ON "swap_preferences"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "swaps_swap_code_key" ON "swaps"("swap_code");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_apartment_id_key" ON "wishlists"("user_id", "apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_listing_payments_apartment_id_key" ON "apartment_listing_payments"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_listing_payments_user_id_key" ON "apartment_listing_payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_listing_payments_transaction_id_key" ON "apartment_listing_payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_rented_payments_report_rented_id_key" ON "report_rented_payments"("report_rented_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_rented_payments_transaction_id_key" ON "report_rented_payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "swap_payments_transaction_id_key" ON "swap_payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_logs_twilio_call_sid_key" ON "call_logs"("twilio_call_sid");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_emails_user_id_key" ON "marketing_emails"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_emails_email_key" ON "marketing_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "ambassadors" ADD CONSTRAINT "ambassadors_recruited_by_id_fkey" FOREIGN KEY ("recruited_by_id") REFERENCES "ambassadors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambassador_attributions" ADD CONSTRAINT "ambassador_attributions_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassadors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambassador_attributions" ADD CONSTRAINT "ambassador_attributions_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambassador_commissions" ADD CONSTRAINT "ambassador_commissions_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassadors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambassador_commissions" ADD CONSTRAINT "ambassador_commissions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "ambassador_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambassador_payouts" ADD CONSTRAINT "ambassador_payouts_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassadors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_availabilities" ADD CONSTRAINT "apartment_availabilities_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_availabilities" ADD CONSTRAINT "apartment_availabilities_weekend_id_fkey" FOREIGN KEY ("weekend_id") REFERENCES "weekend_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rented" ADD CONSTRAINT "report_rented_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rented" ADD CONSTRAINT "report_rented_target_apartment_id_fkey" FOREIGN KEY ("target_apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_preferences" ADD CONSTRAINT "swap_preferences_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_from_app_id_fkey" FOREIGN KEY ("from_app_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_to_app_id_fkey" FOREIGN KEY ("to_app_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_listing_payments" ADD CONSTRAINT "apartment_listing_payments_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_listing_payments" ADD CONSTRAINT "apartment_listing_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rented_payments" ADD CONSTRAINT "report_rented_payments_report_rented_id_fkey" FOREIGN KEY ("report_rented_id") REFERENCES "report_rented"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rented_payments" ADD CONSTRAINT "report_rented_payments_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rented_payments" ADD CONSTRAINT "report_rented_payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_payments" ADD CONSTRAINT "swap_payments_swap_id_fkey" FOREIGN KEY ("swap_id") REFERENCES "swaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_payments" ADD CONSTRAINT "swap_payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interested_requests" ADD CONSTRAINT "interested_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interested_requests" ADD CONSTRAINT "interested_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interested_requests" ADD CONSTRAINT "interested_requests_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_shabbos_id_fkey" FOREIGN KEY ("shabbos_id") REFERENCES "weekend_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_appartment_id_fkey" FOREIGN KEY ("appartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_emails" ADD CONSTRAINT "marketing_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
