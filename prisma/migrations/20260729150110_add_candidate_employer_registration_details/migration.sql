-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'PreferNotToSay');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('Student', 'FreshGraduate', 'ExperiencedProfessional', 'CareerSwitcher');

-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('Under18', 'Age18to24', 'Age25to34', 'Age35to44', 'Age45to54', 'Age55Plus');

-- CreateEnum
CREATE TYPE "JobExperience" AS ENUM ('Studying', 'TraineeIntern', 'Junior', 'Senior', 'Manager', 'Director', 'VP', 'CSuite', 'Partner', 'Founder');

-- CreateEnum
CREATE TYPE "CandidateBackground" AS ENUM ('InformationTechnology', 'BusinessFinance', 'Engineering', 'MarketingCommunications', 'DesignCreative', 'HumanResources', 'ScienceResearch', 'Other');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('SocialMedia', 'UniversityCareerCenter', 'FriendReferral', 'JobPortal', 'TalentbankWebsite', 'Other');

-- CreateEnum
CREATE TYPE "ArrivalTime" AS ENUM ('Morning', 'Midday', 'Afternoon', 'LateAfternoon');

-- CreateEnum
CREATE TYPE "BookingMethod" AS ENUM ('CompleteOnlineForm', 'ScheduleCall', 'WhatsAppMessage');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "age_range" "AgeRange",
ADD COLUMN     "arrival_time" "ArrivalTime",
ADD COLUMN     "background" "CandidateBackground",
ADD COLUMN     "booking_method" "BookingMethod",
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "job_experience" "JobExperience",
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "profile_type" "ProfileType",
ADD COLUMN     "referral_source" "ReferralSource",
ADD COLUMN     "whatsapp_number" TEXT;
