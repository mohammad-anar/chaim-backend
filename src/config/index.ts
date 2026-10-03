import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const resolveFrontendUrl = () => {
  const raw = process.env.FRONTEND_URL || "https://shabbos-rent-website.vercel.app";
  if (raw.includes(",")) {
    const urls = raw.split(",").map((u) => u.trim());
    const prodUrl = urls.find((u) => u.startsWith("https://") && !u.includes("localhost"));
    return prodUrl || urls[0] || "https://shabbos-rent-website.vercel.app";
  }
  return raw.trim() || "https://shabbos-rent-website.vercel.app";
};

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  bcrypt_salt_round: Number(process.env.BCRYPT_SALT_ROUND),
  cors_origin: process.env.CORS_ORIGIN,
  frontend_url: resolveFrontendUrl(),
  email: {
    from: process.env.EMAIL_FROM || "shabbosrent@gmail.com",
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
  },
  admin: {
    name: process.env.NAME,
    email: process.env.EMAIL,
    phone: process.env.PHONE,
    password: process.env.PASSWORD,
    avatar: process.env.AVATAR,
  },
  nedarim: {
    mosad_id: process.env.NEDARIM_MOSAD_ID,
    api_valid: process.env.NEDARIM_API_VALID,
  },
  fees: {
    apartment_listing_fee: Number(process.env.APARTMENT_LISTING_FEE || 28),
    swap_request_fee: Number(process.env.SWAP_REQUEST_FEE || 50),
    report_rented_fee: Number(process.env.REPORT_RENTED_FEE || 50),
  },
  twilio: {
    account_sid: process.env.TWILIO_ACCOUNT_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN,
    phone_number: process.env.TWILIO_PHONE_NUMBER || "+97225007890",
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || "chaim",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "https://rheulevubbexbcdiilzi.supabase.co",
    key:
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY,
    bucket:
      process.env.SUPABASE_BUCKET_NAME ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      "images",
  },
};
