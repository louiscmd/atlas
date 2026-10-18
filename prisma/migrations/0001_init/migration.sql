-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "sex" TEXT,
    "heightCm" DOUBLE PRECISION,
    "startWeightKg" DOUBLE PRECISION,
    "unitSystem" TEXT NOT NULL DEFAULT 'metric',
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "experience" TEXT,
    "trainingHistory" TEXT,
    "activityLevel" TEXT NOT NULL DEFAULT 'moderate',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "secondaryGoal" TEXT,
    "goalWeightKg" DOUBLE PRECISION,
    "musclePriorities" JSONB NOT NULL,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "sessionLength" TEXT NOT NULL DEFAULT '45_60',
    "availableDays" JSONB NOT NULL,
    "trainingLocation" TEXT NOT NULL DEFAULT 'gym',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,

    CONSTRAINT "UserEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultRestSec" INTEGER NOT NULL DEFAULT 90,
    "restByExercise" JSONB NOT NULL,
    "weightIncrementKg" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intensityMetric" TEXT NOT NULL DEFAULT 'rir',
    "notifications" JSONB NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "analyticsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRestrictions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "exerciseId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRestrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "primaryMuscles" JSONB NOT NULL,
    "secondaryMuscles" JSONB NOT NULL,
    "equipment" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "movementPattern" TEXT NOT NULL,
    "instructions" JSONB NOT NULL,
    "commonMistakes" JSONB NOT NULL,
    "tips" JSONB NOT NULL,
    "repMin" INTEGER NOT NULL,
    "repMax" INTEGER NOT NULL,
    "restSec" INTEGER NOT NULL,
    "isTimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAlternative" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "alternativeId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExerciseAlternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseVideo" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "equipment" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "progression" TEXT NOT NULL,
    "deload" TEXT,
    "whoFor" JSONB NOT NULL,
    "whoNotFor" JSONB NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDay" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "warmup" TEXT,

    CONSTRAINT "ProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "id" TEXT NOT NULL,
    "programDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "repMin" INTEGER NOT NULL,
    "repMax" INTEGER NOT NULL,
    "restSec" INTEGER NOT NULL,
    "rir" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProgramExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceProgramId" TEXT,
    "goal" TEXT,
    "difficulty" TEXT,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER,
    "equipment" JSONB NOT NULL,
    "originalText" TEXT,
    "rationale" TEXT,
    "progression" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "WorkoutPlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekId" TEXT,
    "order" INTEGER NOT NULL,
    "weekday" INTEGER,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "warmup" TEXT,
    "notes" TEXT,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "repMin" INTEGER NOT NULL,
    "repMax" INTEGER NOT NULL,
    "restSec" INTEGER NOT NULL,
    "rirTarget" INTEGER,
    "rpeTarget" DOUBLE PRECISION,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "dayId" TEXT,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSessionExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "repMin" INTEGER NOT NULL,
    "repMax" INTEGER NOT NULL,
    "restSec" INTEGER NOT NULL,
    "rirTarget" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "replacedFrom" TEXT,
    "recommendation" TEXT,

    CONSTRAINT "WorkoutSessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" INTEGER,
    "rpe" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "reps" INTEGER,
    "previous" DOUBLE PRECISION,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customName" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ProgressMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pose" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bodyWeightKg" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fiberG" INTEGER,
    "waterMl" INTEGER NOT NULL DEFAULT 2500,
    "maintenanceCalories" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "servingSize" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "servingLabel" TEXT,
    "gramsPerServing" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "userId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodNutrition" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "satFat" DOUBLE PRECISION,

    CONSTRAINT "FoodNutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,

    CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT,
    "confidence" TEXT,
    "notes" TEXT,
    "label" JSONB,
    "aiRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodScanItem" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "preparation" TEXT,
    "kcalPer100" DOUBLE PRECISION NOT NULL,
    "proteinPer100" DOUBLE PRECISION NOT NULL,
    "carbsPer100" DOUBLE PRECISION NOT NULL,
    "fatPer100" DOUBLE PRECISION NOT NULL,
    "fiberPer100" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "FoodScanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foodId" TEXT,
    "scanId" TEXT,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "amountLabel" TEXT,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "satFat" DOUBLE PRECISION,
    "isEstimate" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "coach" JSONB,
    "coachSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "service" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "renewsAt" TIMESTAMP(3),
    "provider" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "actorHash" TEXT,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGoals_userId_key" ON "UserGoals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipment_userId_equipment_key" ON "UserEquipment"("userId", "equipment");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserRestrictions_userId_idx" ON "UserRestrictions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAlternative_exerciseId_alternativeId_key" ON "ExerciseAlternative"("exerciseId", "alternativeId");

-- CreateIndex
CREATE INDEX "ExerciseVideo_exerciseId_idx" ON "ExerciseVideo"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramTemplate_slug_key" ON "ProgramTemplate"("slug");

-- CreateIndex
CREATE INDEX "ProgramDay_programId_idx" ON "ProgramDay"("programId");

-- CreateIndex
CREATE INDEX "ProgramExercise_programDayId_idx" ON "ProgramExercise"("programDayId");

-- CreateIndex
CREATE INDEX "WorkoutPlan_userId_isActive_idx" ON "WorkoutPlan"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlanWeek_planId_weekNumber_key" ON "WorkoutPlanWeek"("planId", "weekNumber");

-- CreateIndex
CREATE INDEX "WorkoutDay_planId_idx" ON "WorkoutDay"("planId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_dayId_idx" ON "WorkoutExercise"("dayId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_sessionId_idx" ON "WorkoutSessionExercise"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_clientId_key" ON "WorkoutSet"("clientId");

-- CreateIndex
CREATE INDEX "WorkoutSet_userId_exerciseId_completedAt_idx" ON "WorkoutSet"("userId", "exerciseId", "completedAt");

-- CreateIndex
CREATE INDEX "WorkoutSet_sessionExerciseId_idx" ON "WorkoutSet"("sessionExerciseId");

-- CreateIndex
CREATE INDEX "PersonalRecord_userId_exerciseId_type_idx" ON "PersonalRecord"("userId", "exerciseId", "type");

-- CreateIndex
CREATE INDEX "ProgressMeasurement_userId_type_measuredAt_idx" ON "ProgressMeasurement"("userId", "type", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPhoto_storageKey_key" ON "ProgressPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "ProgressPhoto_userId_takenAt_idx" ON "ProgressPhoto"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "NutritionTarget_userId_effectiveFrom_idx" ON "NutritionTarget"("userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Food_userId_idx" ON "Food"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodNutrition_foodId_key" ON "FoodNutrition"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodFavorite_userId_foodId_key" ON "FoodFavorite"("userId", "foodId");

-- CreateIndex
CREATE INDEX "Meal_userId_idx" ON "Meal"("userId");

-- CreateIndex
CREATE INDEX "FoodScan_userId_createdAt_idx" ON "FoodScan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");

-- CreateIndex
CREATE INDEX "WaterLog_userId_date_idx" ON "WaterLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AIRequest_userId_service_createdAt_idx" ON "AIRequest"("userId", "service", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIResponse_requestId_key" ON "AIResponse"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoals" ADD CONSTRAINT "UserGoals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRestrictions" ADD CONSTRAINT "UserRestrictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRestrictions" ADD CONSTRAINT "UserRestrictions_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAlternative" ADD CONSTRAINT "ExerciseAlternative_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAlternative" ADD CONSTRAINT "ExerciseAlternative_alternativeId_fkey" FOREIGN KEY ("alternativeId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseVideo" ADD CONSTRAINT "ExerciseVideo_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_sourceProgramId_fkey" FOREIGN KEY ("sourceProgramId") REFERENCES "ProgramTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPlanWeek" ADD CONSTRAINT "WorkoutPlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "WorkoutPlanWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "WorkoutSessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressMeasurement" ADD CONSTRAINT "ProgressMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodNutrition" ADD CONSTRAINT "FoodNutrition_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodScan" ADD CONSTRAINT "FoodScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodScanItem" ADD CONSTRAINT "FoodScanItem_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "FoodScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "FoodScan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponse" ADD CONSTRAINT "AIResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AIRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

