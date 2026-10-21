require("dotenv").config();

if(!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not defined in environment variables")
}


if(!process.env.DIRECT_URL) {
    console.log("DIRECT_URL is not defined in environment variables")
}

if(!process.env. JWT_SECRET) {
    console.log("JWT_SECRET is not defined in environment variables")
}

if(!process.env.JWT_EXPIRES_IN) {
    console.log("JWT_EXPIRES_IN is not defined in environment variables")
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,

  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
};




