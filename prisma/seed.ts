import { PrismaClient, UserRole, ApartmentStatus, PropertyType, AmbassadorStatus, AmbassadorModel, AttributionMethod, AttributionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  const saltRound = 10;
  const commonPassword = await bcrypt.hash("password123", saltRound);

  // 1. Seed Weekend Calendars (Upcoming 4 weeks)
  const now = new Date();
  const getNextFriday = (weeksAhead: number) => {
    const d = new Date(now);
    const day = d.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday + weeksAhead * 7);
    d.setHours(16, 0, 0, 0);
    return d;
  };

  const weekends = [
    { title: "Parshat Ki Tisa", date: getNextFriday(0) },
    { title: "Parshat Vayakhel", date: getNextFriday(1) },
    { title: "Parshat Pekudei", date: getNextFriday(2) },
    { title: "Parshat Vayikra", date: getNextFriday(3) },
  ];

  const createdWeekends = [];
  for (const w of weekends) {
    const record = await prisma.weekendCalendar.upsert({
      where: { title: w.title },
      update: { date: w.date },
      create: { title: w.title, date: w.date },
    });
    createdWeekends.push(record);
  }
  console.log(`✅ Seeded ${createdWeekends.length} Weekend Calendars`);

  // 2. Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@shabosrent.com" },
    update: {
      role: UserRole.SUPER_ADMIN,
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
    create: {
      username: "admin",
      email: "admin@shabosrent.com",
      phone: "0500000000",
      role: UserRole.SUPER_ADMIN,
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
  });
  console.log(`✅ Seeded Admin: ${admin.email}`);

  // 3. Seed User 1 (Host with Apartment)
  const user1 = await prisma.user.upsert({
    where: { email: "user1@shabosrent.com" },
    update: {
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
    create: {
      username: "user1",
      email: "user1@shabosrent.com",
      phone: "0501112233",
      role: UserRole.USER,
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
  });
  console.log(`✅ Seeded User 1: ${user1.email}`);

  // 4. Seed User 2 (Guest / Fresh User)
  const user2 = await prisma.user.upsert({
    where: { email: "user2@shabosrent.com" },
    update: {
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
    create: {
      username: "user2",
      email: "user2@shabosrent.com",
      phone: "0504445566",
      role: UserRole.USER,
      password: commonPassword,
      isVerified: true,
      status: "ACTIVE",
    },
  });
  console.log(`✅ Seeded User 2: ${user2.email}`);

  // 5. Seed Ambassador
  const ambassador = await prisma.ambassador.upsert({
    where: { email: "ambassador@shabosrent.com" },
    update: {
      password: commonPassword,
      status: AmbassadorStatus.ACTIVE,
      referralCode: "SHABOS-DEMO",
    },
    create: {
      name: "Demo Ambassador",
      email: "ambassador@shabosrent.com",
      phone: "0507778899",
      password: commonPassword,
      referralCode: "SHABOS-DEMO",
      status: AmbassadorStatus.ACTIVE,
      defaultModel: AmbassadorModel.MODEL_A,
      rates: {
        modelAListing: 15,
        modelARental: 25,
        modelBListing: 25,
        modelBRental: 40,
        subReferralListing: 5,
      },
    },
  });
  console.log(`✅ Seeded Ambassador: ${ambassador.email} (Code: ${ambassador.referralCode})`);

  // 6. Seed Apartment for User 1
  let apt = await prisma.apartment.findUnique({
    where: { userId: user1.id },
  });

  if (!apt) {
    apt = await prisma.apartment.create({
      data: {
        userId: user1.id,
        propertyId: "APT-1001",
        title: "Luxury Jerusalem Penthouse near Kotel",
        description: "Spacious 3-bedroom apartment walking distance to Kotel and Mamilla Mall. Fully kosher kitchen.",
        city: "Jerusalem",
        neighborhood: "Mamilla",
        propertyType: PropertyType.APARTMENT,
        bedrooms: 3,
        bathrooms: 2,
        maxGuest: 8,
        pricePerShabbat: 1200,
        amenities: ["Wifi", "Air Conditioning", "Shabbat Elevator", "Kosher Kitchen", "Plata", "Urn"],
        coverImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
        status: ApartmentStatus.CONFIRMED,
      },
    });
  } else {
    apt = await prisma.apartment.update({
      where: { id: apt.id },
      data: {
        status: ApartmentStatus.CONFIRMED,
      },
    });
  }
  console.log(`✅ Seeded Apartment: ${apt.title} (ID: ${apt.id})`);

  // 7. Seed Listing Payment for the Apartment (Active for 1 year)
  const paidAt = new Date();
  const expiresAt = new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000);

  await prisma.apartmentListingPayment.upsert({
    where: { apartmentId: apt.id },
    update: {
      status: "COMPLETED",
      paidAt,
      expiresAt,
      transactionId: "TX-SEED-1001",
    },
    create: {
      apartmentId: apt.id,
      userId: user1.id,
      amount: 28,
      currency: "ILS",
      paymentMethod: "CREDIT_CARD",
      status: "COMPLETED",
      paidAt,
      expiresAt,
      transactionId: "TX-SEED-1001",
    },
  });

  // 8. Seed Availability with Special Price for First Weekend
  if (createdWeekends.length > 0) {
    await prisma.apartmentAvailability.upsert({
      where: {
        apartmentId_weekendId: {
          apartmentId: apt.id,
          weekendId: createdWeekends[0].id,
        },
      },
      update: {
        isSpecial: true,
        specialPrice: 1000,
      },
      create: {
        apartmentId: apt.id,
        weekendId: createdWeekends[0].id,
        isSpecial: true,
        specialPrice: 1000,
      },
    });
    console.log(`✅ Seeded Special Availability for Weekend: ${createdWeekends[0].title}`);
  }

  // 9. Seed Ambassador Attribution & Commission for User 1's Apartment
  await prisma.ambassadorAttribution.upsert({
    where: { apartmentId: apt.id },
    update: {
      ambassadorId: ambassador.id,
      status: AttributionStatus.ACTIVE,
    },
    create: {
      apartmentId: apt.id,
      ambassadorId: ambassador.id,
      apartmentTitle: apt.title,
      ownerName: user1.username,
      ownerPhone: user1.phone || "0501112233",
      ownerEmail: user1.email,
      model: AmbassadorModel.MODEL_A,
      modelDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      method: AttributionMethod.LINK,
      status: AttributionStatus.ACTIVE,
    },
  });

  const existingListingComm = await prisma.ambassadorCommission.findFirst({
    where: {
      ambassadorId: ambassador.id,
      sourceListingId: apt.id,
      type: "LISTING",
    },
  });

  if (!existingListingComm) {
    await prisma.ambassadorCommission.create({
      data: {
        ambassadorId: ambassador.id,
        type: "LISTING",
        sourceListingId: apt.id,
        apartmentTitle: apt.title,
        amount: 15,
        status: "APPROVED",
        earnedAt: now,
      },
    });
  }

  // 10. Seed City Search Volume logs
  const cities = [
    { city: "Jerusalem", searchCount: 35 },
    { city: "Bnei Brak", searchCount: 22 },
    { city: "Beit Shemesh", searchCount: 17 },
    { city: "Tsfat", searchCount: 11 },
    { city: "Netanya", searchCount: 8 },
  ];

  for (const c of cities) {
    await prisma.citySearchLog.upsert({
      where: { city: c.city },
      update: { searchCount: c.searchCount },
      create: c,
    });
  }
  console.log("✅ Seeded City Search Logs for Admin Analytics");

  console.log("\n🎉 Database seeded successfully!");
  console.log("-----------------------------------------");
  console.log("Demo Credentials:");
  console.log("👑 Admin:      admin@shabosrent.com / password123");
  console.log("🏠 Host:       user1@shabosrent.com / password123 (or phone 0501112233)");
  console.log("👤 Guest:      user2@shabosrent.com / password123 (or phone 0504445566)");
  console.log("🤝 Ambassador: ambassador@shabosrent.com / password123 (Code: SHABOS-DEMO)");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
