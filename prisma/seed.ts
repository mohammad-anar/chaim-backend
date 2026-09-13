import {
  PrismaClient,
  UserRole,
  UserStatus,
  ApartmentStatus,
  PropertyType,
  HowToContact,
  PaymentStatus,
  PaymentMethod,
  NotificationPreference,
  AmbassadorStatus,
  AmbassadorModel,
  AttributionMethod,
  AttributionStatus,
  ReviewStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const getUniquePropertyId = async (preferredPrefixNum: number): Promise<string> => {
  let num = preferredPrefixNum;
  let propertyId = `apart-${String(num).padStart(3, "0")}`;

  let existing = await prisma.apartment.findUnique({
    where: { propertyId },
  });

  while (existing) {
    num += 100;
    propertyId = `apart-${String(num).padStart(3, "0")}`;
    existing = await prisma.apartment.findUnique({
      where: { propertyId },
    });
  }

  return propertyId;
};

async function main() {
  console.log("🌱 Starting database seeding...");

  const saltRound = 10;
  const commonPassword = await bcrypt.hash("12345678", saltRound);

  // ---------------------------------------------------------------------------
  // 1. Seed Weekend Calendars (Upcoming 4 weeks)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 2. Seed Admin & Existing Demo Accounts
  // ---------------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@shabosrent.com" },
    update: {
      role: UserRole.SUPER_ADMIN,
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: "admin",
      email: "admin@shabosrent.com",
      phone: "0500000000",
      role: UserRole.SUPER_ADMIN,
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✅ Seeded Admin: ${admin.email}`);

  const user1 = await prisma.user.upsert({
    where: { email: "user1@shabosrent.com" },
    update: {
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: "user1",
      email: "user1@shabosrent.com",
      phone: "0501112233",
      role: UserRole.USER,
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "user2@shabosrent.com" },
    update: {
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: "user2",
      email: "user2@shabosrent.com",
      phone: "0504445566",
      role: UserRole.USER,
      password: commonPassword,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
  });

  // ---------------------------------------------------------------------------
  // 3. Seed Ambassador
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 4. Seed 20 Demo Owners and 20 Demo Apartments
  // ---------------------------------------------------------------------------
  const demoCoverImage = "/image/qutation-card-1789192324279.png";
  const demoImages = [
    "/image/gemini-generated-image-y6vej3y6vej3y6ve-1789192324296.png",
    "/image/chatgpt-image-aug-16-2026-04-04-11-pm-1789192324317.png",
    "/image/chatgpt-image-aug-16-2026-04-07-52-pm-1789192324336.png",
    "/image/container-1789192324361.png",
  ];

  const apartmentDataList = [
    {
      title: "Luxury Penthouse overlooking Mamilla & Old City",
      description: "Breathtaking views of the Old City walls. Fully equipped Kosher Mehadrin kitchen, Shabbat elevator, and spacious dining salon.",
      city: "Jerusalem",
      neighborhood: "Mamilla",
      street1: "King David St 12",
      propertyType: PropertyType.PENTHOUSE,
      bedrooms: 4,
      bathrooms: 3,
      maxGuest: 10,
      pricePerShabbat: 2200,
      lat: 31.7770,
      lng: 35.2210,
      neighborhoodWalkingMinutes: 5,
      amenities: ["Wifi", "Air Conditioning", "Shabbat Elevator", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Linen Provided", "Crib Available"],
    },
    {
      title: "Spacious Geula Family Home Near Shuls",
      description: "Heart of Geula, 2 minutes from central yeshivas and bakeries. Quiet back-facing bedrooms, full air conditioning and warm atmosphere.",
      city: "Jerusalem",
      neighborhood: "Geula",
      street1: "Malchei Yisrael 24",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 8,
      pricePerShabbat: 1300,
      lat: 31.7930,
      lng: 35.2163,
      neighborhoodWalkingMinutes: 2,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Linen Provided"],
    },
    {
      title: "Modern Rehavia Garden Apartment",
      description: "Stunning garden terrace in green Rehavia. Modern kosher kitchen with separate sinks and appliances. Ideal for families and couples.",
      city: "Jerusalem",
      neighborhood: "Rehavia",
      street1: "Azza St 18",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 7,
      pricePerShabbat: 1500,
      lat: 31.7750,
      lng: 35.2130,
      neighborhoodWalkingMinutes: 6,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Terrace", "Garden", "Linen Provided"],
    },
    {
      title: "Scenic Har Nof Panoramic Villa Suite",
      description: "Spectacular Judean hills view in tranquil Har Nof. High floor with private Shabbat elevator, 5 large bedrooms, and luxury finishes.",
      city: "Jerusalem",
      neighborhood: "Har Nof",
      street1: "Agassi St 7",
      propertyType: PropertyType.PENTHOUSE,
      bedrooms: 5,
      bathrooms: 3,
      maxGuest: 12,
      pricePerShabbat: 2600,
      lat: 31.7776,
      lng: 35.1650,
      neighborhoodWalkingMinutes: 4,
      amenities: ["Wifi", "Air Conditioning", "Shabbat Elevator", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Washing Machine"],
    },
    {
      title: "Old City Jewish Quarter Historic Stone Suite",
      description: "Authentic Jerusalem stone architecture, 3 minute walk to the Western Wall (Kotel). Unmatched historic shabbat experience.",
      city: "Jerusalem",
      neighborhood: "Jewish Quarter",
      street1: "Beit El St 4",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 2,
      bathrooms: 2,
      maxGuest: 6,
      pricePerShabbat: 1800,
      lat: 31.7750,
      lng: 35.2320,
      neighborhoodWalkingMinutes: 3,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Linen Provided", "Kotel View"],
    },
    {
      title: "Bnei Brak Center Premium Shabbat Haven",
      description: "Central Bnei Brak near Hazon Ish and Rabbi Akiva. Completely renovated, noise-insulated windows, central A/C and comfortable beds.",
      city: "Bnei Brak",
      neighborhood: "Bnei Brak",
      street1: "Rabbi Akiva 72",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 8,
      pricePerShabbat: 1100,
      lat: 32.0837,
      lng: 34.8338,
      neighborhoodWalkingMinutes: 3,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Linen Provided", "Crib Available"],
    },
    {
      title: "Ramat Beit Shemesh Alef Sunny Terrace Residence",
      description: "Spacious 4-bedroom apartment in RBS Alef near Dolev park. Large sukkah balcony, central AC, and close to multiple English shuls.",
      city: "Beit Shemesh",
      neighborhood: "Ramat Beit Shemesh",
      street1: "Nachal Dolev 35",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 4,
      bathrooms: 2,
      maxGuest: 9,
      pricePerShabbat: 1250,
      lat: 31.7100,
      lng: 34.9850,
      neighborhoodWalkingMinutes: 5,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Linen Provided"],
    },
    {
      title: "Kiryat Sanz Oceanview Shabbat Retreat",
      description: "Steps from Sanz beachfront and central Beit Midrash. Fresh sea breeze, master bedroom suite, and full Shabbat accommodations.",
      city: "Netanya",
      neighborhood: "Kiryat Sanz",
      street1: "Divrei Chaim 15",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 7,
      pricePerShabbat: 1400,
      lat: 32.3480,
      lng: 34.8590,
      neighborhoodWalkingMinutes: 4,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Sea View", "Linen Provided"],
    },
    {
      title: "Historic Old City Tzfat Artist Colony Villa",
      description: "Centuries-old vaulted ceilings with modern luxury. Mystical mountain views, walking distance to ancient Ari and Yosef Caro shuls.",
      city: "Tzfat",
      neighborhood: "Tzfat",
      street1: "HaAri St 21",
      propertyType: PropertyType.VILLA,
      bedrooms: 4,
      bathrooms: 3,
      maxGuest: 10,
      pricePerShabbat: 1900,
      lat: 32.9646,
      lng: 35.4961,
      neighborhoodWalkingMinutes: 5,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Courtyard", "Linen Provided"],
    },
    {
      title: "Tiberias Kinneret Panorama Vacation Home",
      description: "Overlooking the Sea of Galilee. Private pool, large dining hall for Simchas, and immaculate kosher kitchen setup.",
      city: "Tiberias",
      neighborhood: "Tiberias",
      street1: "HaGedud HaIvri 9",
      propertyType: PropertyType.VILLA,
      bedrooms: 5,
      bathrooms: 4,
      maxGuest: 14,
      pricePerShabbat: 2800,
      lat: 32.7959,
      lng: 35.5312,
      neighborhoodWalkingMinutes: 7,
      amenities: ["Wifi", "Air Conditioning", "Private Pool", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Lake View"],
    },
    {
      title: "Bayit VeGan Serene Shabbat Home",
      description: "Quiet residential location close to Mount Herzl and Shaare Zedek. Light-filled salon, comfortable beds, and full Shabbat amenities.",
      city: "Jerusalem",
      neighborhood: "Bayit VeGan",
      street1: "Hapisga St 30",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 8,
      pricePerShabbat: 1200,
      lat: 31.7700,
      lng: 35.1920,
      neighborhoodWalkingMinutes: 4,
      amenities: ["Wifi", "Air Conditioning", "Shabbat Elevator", "Kosher Kitchen", "Plata", "Urn", "Linen Provided"],
    },
    {
      title: "Crown Heights Chabad Center Luxury Loft",
      description: "Located blocks from 770 Eastern Parkway. Modern open-concept kitchen, high ceilings, custom millwork, and full Shabbat features.",
      city: "New York",
      neighborhood: "Crown Heights",
      street1: "Kingston Ave 142",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 2,
      bathrooms: 1,
      maxGuest: 5,
      pricePerShabbat: 950,
      lat: 40.6694,
      lng: -73.9422,
      neighborhoodWalkingMinutes: 3,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Linen Provided"],
    },
    {
      title: "Borough Park 14th Ave Large Duplex",
      description: "Heart of Borough Park shopping and shuls. Two levels of spacious living, 4 private bedrooms, dining room for 12 guests.",
      city: "New York",
      neighborhood: "Borough Park",
      street1: "14th Ave & 48th St",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 4,
      bathrooms: 3,
      maxGuest: 11,
      pricePerShabbat: 1750,
      lat: 40.6350,
      lng: -73.9921,
      neighborhoodWalkingMinutes: 2,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Linen Provided", "Crib Available"],
    },
    {
      title: "Lakewood Forest Avenue Estate",
      description: "Expansive private property in Lakewood. 6 bedrooms, multiple sitting areas, children playroom, and minutes to BMG.",
      city: "Lakewood",
      neighborhood: "Lakewood",
      street1: "Forest Ave 512",
      propertyType: PropertyType.VILLA,
      bedrooms: 6,
      bathrooms: 4,
      maxGuest: 15,
      pricePerShabbat: 2400,
      lat: 40.0968,
      lng: -74.2174,
      neighborhoodWalkingMinutes: 6,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Lawn", "Linen Provided"],
    },
    {
      title: "Miami Beach Surfside Kosher Luxury Suite",
      description: "1 block from the Atlantic beach and Shul of Bal Harbour. High end designer furnishings, keyless entry, Shabbat timers.",
      city: "Miami Beach",
      neighborhood: "Surfside",
      street1: "Collins Ave 9210",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 2,
      bathrooms: 2,
      maxGuest: 6,
      pricePerShabbat: 2100,
      lat: 25.8784,
      lng: -80.1242,
      neighborhoodWalkingMinutes: 4,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Pool Access", "Ocean View"],
    },
    {
      title: "Romema Luxury Tower with Shabbat Elevator",
      description: "New construction tower at Jerusalem entrance. Panoramic city vistas, high speed Shabbat elevator, luxury beds and linens.",
      city: "Jerusalem",
      neighborhood: "Romema",
      street1: "Sarig St 5",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 8,
      pricePerShabbat: 1600,
      lat: 31.7950,
      lng: 35.2050,
      neighborhoodWalkingMinutes: 3,
      amenities: ["Wifi", "Air Conditioning", "Shabbat Elevator", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Linen Provided"],
    },
    {
      title: "Sanhedria Murchevet Peaceful Green Oasis",
      description: "Corner ground-floor apartment with private garden in Sanhedria. Peaceful, green, and walking distance to Ramat Eshkol.",
      city: "Jerusalem",
      neighborhood: "Sanhedria",
      street1: "Yam Suf 16",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 4,
      bathrooms: 2,
      maxGuest: 9,
      pricePerShabbat: 1350,
      lat: 31.8020,
      lng: 35.2270,
      neighborhoodWalkingMinutes: 5,
      amenities: ["Wifi", "Air Conditioning", "Garden", "Kosher Kitchen", "Plata", "Urn", "Linen Provided"],
    },
    {
      title: "Ashdod Sea Breeze Shabbat Residence",
      description: "Close to the waterfront promenade and Ashdod Chareidi quarter. Clean, spacious, and fully equipped for large family gatherings.",
      city: "Ashdod",
      neighborhood: "Ashdod",
      street1: "Rova Zayin 8",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 7,
      pricePerShabbat: 1150,
      lat: 31.8044,
      lng: 34.6553,
      neighborhoodWalkingMinutes: 6,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Balcony", "Linen Provided"],
    },
    {
      title: "Beitar Illit Mountain View Family Flat",
      description: "Serene hills surrounding Beitar Illit. Large terrace with sukkah pergola, comfortable living area, close to central shuls.",
      city: "Beitar Illit",
      neighborhood: "Beitar Illit",
      street1: "Harav Shach 22",
      propertyType: PropertyType.APARTMENT,
      bedrooms: 3,
      bathrooms: 2,
      maxGuest: 8,
      pricePerShabbat: 900,
      lat: 31.6910,
      lng: 35.1280,
      neighborhoodWalkingMinutes: 3,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchen", "Plata", "Urn", "Terrace", "Linen Provided"],
    },
    {
      title: "Studio Mamilla Boutique for Couples",
      description: "Chic and modern studio suite near Mamilla Mall and Jaffa Gate. Perfect romantic Shabbat escape with custom kitchenette.",
      city: "Jerusalem",
      neighborhood: "Mamilla",
      street1: "Agron St 8",
      propertyType: PropertyType.STUDIO,
      bedrooms: 1,
      bathrooms: 1,
      maxGuest: 2,
      pricePerShabbat: 750,
      lat: 31.7770,
      lng: 35.2210,
      neighborhoodWalkingMinutes: 4,
      amenities: ["Wifi", "Air Conditioning", "Kosher Kitchenette", "Plata", "Urn", "Linen Provided"],
    },
  ];

  console.log(`\n🏢 Seeding 20 Owners & 20 Demo Apartments...`);

  const paidAt = new Date();
  const expiresAt = new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (let i = 1; i <= 20; i++) {
    const email = `owner${i}@gmail.com`;
    const username = `owner${i}`;
    const phone = `05010000${String(i).padStart(2, "0")}`;
    const aptInfo = apartmentDataList[i - 1];

    // 1. Create or Update Owner User
    const owner = await prisma.user.upsert({
      where: { email },
      update: {
        username,
        phone,
        password: commonPassword,
        role: UserRole.USER,
        isVerified: true,
        status: UserStatus.ACTIVE,
      },
      create: {
        username,
        email,
        phone,
        password: commonPassword,
        role: UserRole.USER,
        isVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    // 2. Owner Notification Preference & Marketing Email
    await prisma.ownerNotificationPreference.upsert({
      where: { userId: owner.id },
      update: {
        channel: NotificationPreference.BOTH,
        notificationEmail: email,
        notificationPhone: phone,
      },
      create: {
        userId: owner.id,
        channel: NotificationPreference.BOTH,
        notificationEmail: email,
        notificationPhone: phone,
      },
    });

    await prisma.marketingEmail.upsert({
      where: { userId: owner.id },
      update: {
        email,
        isSubscribed: true,
      },
      create: {
        userId: owner.id,
        email,
        isSubscribed: true,
      },
    });

    // 3. Create or Update Apartment
    let apartment = await prisma.apartment.findUnique({
      where: { userId: owner.id },
    });

    const propertyId = apartment?.propertyId || (await getUniquePropertyId(i));

    const aptPayload = {
      propertyId,
      title: aptInfo.title,
      description: aptInfo.description,
      city: aptInfo.city,
      neighborhood: aptInfo.neighborhood,
      street1: aptInfo.street1,
      street2: null,
      lat: aptInfo.lat,
      lng: aptInfo.lng,
      propertyType: aptInfo.propertyType,
      bedrooms: aptInfo.bedrooms,
      bathrooms: aptInfo.bathrooms,
      maxGuest: aptInfo.maxGuest,
      pricePerShabbat: aptInfo.pricePerShabbat,
      neighborhoodWalkingMinutes: aptInfo.neighborhoodWalkingMinutes,
      neighborhoodLat: aptInfo.lat,
      neighborhoodLng: aptInfo.lng,
      amenities: aptInfo.amenities,
      coverImage: demoCoverImage,
      images: demoImages,
      phoneNumber: phone,
      whatsApp: phone,
      howToContact: HowToContact.BOTH,
      additionalDetails: "Strict Mehadrin kitchen, separate sinks, beautiful Shabbat setup.",
      status: ApartmentStatus.CONFIRMED,
    };

    if (!apartment) {
      apartment = await prisma.apartment.create({
        data: {
          userId: owner.id,
          ...aptPayload,
        },
      });
    } else {
      apartment = await prisma.apartment.update({
        where: { id: apartment.id },
        data: aptPayload,
      });
    }

    // 4. Listing Payment (1 Year Active)
    await prisma.apartmentListingPayment.upsert({
      where: { apartmentId: apartment.id },
      update: {
        userId: owner.id,
        amount: 28,
        currency: "ILS",
        paymentMethod: PaymentMethod.NEDARIM_PLUS,
        status: PaymentStatus.COMPLETED,
        paidAt,
        expiresAt,
        transactionId: `TX-OWNER-PAY-${i}`,
      },
      create: {
        apartmentId: apartment.id,
        userId: owner.id,
        amount: 28,
        currency: "ILS",
        paymentMethod: PaymentMethod.NEDARIM_PLUS,
        status: PaymentStatus.COMPLETED,
        paidAt,
        expiresAt,
        transactionId: `TX-OWNER-PAY-${i}`,
      },
    });

    // 5. Availabilities for Upcoming Weekends
    for (let wIdx = 0; wIdx < createdWeekends.length; wIdx++) {
      const weekend = createdWeekends[wIdx];
      const isSpecial = wIdx === 0 && i % 3 === 0; // mark some with special discount
      const specialPrice = isSpecial ? Math.round(aptInfo.pricePerShabbat * 0.85) : null;

      await prisma.apartmentAvailability.upsert({
        where: {
          apartmentId_weekendId: {
            apartmentId: apartment.id,
            weekendId: weekend.id,
          },
        },
        update: {
          isSpecial,
          specialPrice,
        },
        create: {
          apartmentId: apartment.id,
          weekendId: weekend.id,
          isSpecial,
          specialPrice,
        },
      });
    }

    // 6. Swap Preference
    await prisma.swapPreference.upsert({
      where: { apartmentId: apartment.id },
      update: {
        isEnabled: true,
        city: i % 2 === 0 ? "Jerusalem" : "Netanya",
        neighborhood: i % 2 === 0 ? "Geula" : "Kiryat Sanz",
        rooms: aptInfo.bedrooms,
        beds: aptInfo.maxGuest,
        whatsApp: phone,
        email: email,
      },
      create: {
        apartmentId: apartment.id,
        isEnabled: true,
        city: i % 2 === 0 ? "Jerusalem" : "Netanya",
        neighborhood: i % 2 === 0 ? "Geula" : "Kiryat Sanz",
        rooms: aptInfo.bedrooms,
        beds: aptInfo.maxGuest,
        whatsApp: phone,
        email: email,
      },
    });

    // 7. Seed Reviews on select apartments
    if (i % 2 === 1) {
      const existingReview = await prisma.review.findFirst({
        where: {
          apartmentId: apartment.id,
          userId: user2.id,
        },
      });

      if (!existingReview) {
        await prisma.review.create({
          data: {
            apartmentId: apartment.id,
            userId: user2.id,
            title: "Wonderful Shabbat Experience!",
            message: "The apartment was spotless, well prepared for Shabbat, with a warm and welcoming host. Highly recommend!",
            rating: 4.9,
            status: ReviewStatus.APPROVED,
          },
        });
      }
    }

    // 8. Seed Ambassador Attribution on some apartments
    if (i <= 5) {
      await prisma.ambassadorAttribution.upsert({
        where: { apartmentId: apartment.id },
        update: {
          ambassadorId: ambassador.id,
          status: AttributionStatus.ACTIVE,
        },
        create: {
          apartmentId: apartment.id,
          ambassadorId: ambassador.id,
          apartmentTitle: apartment.title,
          ownerName: owner.username,
          ownerPhone: owner.phone || phone,
          ownerEmail: owner.email,
          model: AmbassadorModel.MODEL_A,
          modelDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          method: AttributionMethod.LINK,
          status: AttributionStatus.ACTIVE,
        },
      });
    }

    console.log(`  [${i}/20] ✅ Seeded ${owner.email} -> "${apartment.title}" (ID: ${apartment.propertyId})`);
  }

  // ---------------------------------------------------------------------------
  // 5. Seed City Search Volume logs
  // ---------------------------------------------------------------------------
  const cities = [
    { city: "Jerusalem", searchCount: 85 },
    { city: "Bnei Brak", searchCount: 52 },
    { city: "Beit Shemesh", searchCount: 44 },
    { city: "Netanya", searchCount: 38 },
    { city: "Tzfat", searchCount: 29 },
    { city: "Tiberias", searchCount: 25 },
    { city: "New York", searchCount: 31 },
    { city: "Lakewood", searchCount: 20 },
    { city: "Miami Beach", searchCount: 18 },
  ];

  for (const c of cities) {
    await prisma.citySearchLog.upsert({
      where: { city: c.city },
      update: { searchCount: c.searchCount },
      create: c,
    });
  }
  console.log("✅ Seeded City Search Logs for Analytics");

  console.log("\n🎉 Database seeded successfully!");
  console.log("=========================================");
  console.log("Demo Credentials:");
  console.log("🔑 Password for all demo accounts: 12345678");
  console.log("👑 Super Admin: admin@shabosrent.com (pw: 12345678)");
  console.log("🤝 Ambassador:  ambassador@shabosrent.com (pw: 12345678, Code: SHABOS-DEMO)");
  console.log("🏠 20 Demo Owners:");
  console.log("   owner1@gmail.com to owner20@gmail.com");
  console.log("   Password: 12345678");
  console.log("   Phone: 0501000001 to 0501000020");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
