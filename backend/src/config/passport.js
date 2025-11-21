import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/UserModel.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, cb) {
      try {
        const email = profile.emails[0].value;

        // 1. Check if user exists by email
        let user = await UserModel.findByEmail(email);

        if (user) {
          // User exists, log them in
          return cb(null, user);
        } else {
          // 2. User does not exist, create new user
          // Generate a random password since we can't store null in password_hash (assuming it might be not null in DB, though we tried to change it but user said no schema change.
          // If the DB column allows null, we can pass null. If not, we need a dummy password.
          // User said "no schema change", so we assume strict schema.
          const randomPassword = uuidv4();
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(randomPassword, salt);

          const newUser = {
            email: email,
            passwordHash: passwordHash,
            name: profile.name.givenName || "Google",
            surname: profile.name.familyName || "User",
            sex: "O", // Default
            user_address_1: "",
            user_address_2: "",
            user_address_3: "",
          };

          const createdUser = await UserModel.createUser(newUser);
          return cb(null, createdUser);
        }
      } catch (err) {
        return cb(err, null);
      }
    }
  )
);

export default passport;
