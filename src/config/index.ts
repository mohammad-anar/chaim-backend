import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  redis_url: process.env.REDIS_URL,
  bcrypt_salt_round: Number(process.env.BCRYPT_SALT_ROUND),
  cors_origin: process.env.CORS_ORIGIN,
  frontend_url: process.env.FRONTEND_URL,
  email: {
    from: process.env.EMAIL_FROM,
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
    apartment_listing_fee: Number(process.env.APARTMENT_LISTING_FEE || 100),
    swap_request_fee: Number(process.env.SWAP_REQUEST_FEE || 50),
    report_rented_fee: Number(process.env.REPORT_RENTED_FEE || 50),
  },
};
