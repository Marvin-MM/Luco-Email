
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './database.js';
import { logger } from '../utils/logger.js';

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info('Google OAuth callback received', {
          profileId: profile.id,
          email: profile.emails[0].value,
        });

        const email = profile.emails[0].value;
        const googleId = profile.id;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;
        const profilePicture = profile.photos[0]?.value;

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { googleId },
          include: {
            tenant: true,
          },
        });

        if (user) {
          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              profilePicture: profilePicture || user.profilePicture,
            },
          });

          logger.info('Existing Google user logged in', { userId: user.id });
          return done(null, user);
        }

        // Check if user exists with same email but different auth method
        const existingEmailUser = await prisma.user.findUnique({
          where: { email },
          include: {
            tenant: true,
          },
        });

        if (existingEmailUser) {
          // Link Google account to existing user
          const updatedUser = await prisma.user.update({
            where: { id: existingEmailUser.id },
            data: {
              googleId,
              isEmailVerified: true, // Auto-verify since Google has verified the email
              profilePicture: profilePicture || existingEmailUser.profilePicture,
              lastLoginAt: new Date(),
            },
            include: {
              tenant: true,
            },
          });

          logger.info('Linked Google account to existing user', {
            userId: updatedUser.id,
          });
          return done(null, updatedUser);
        }

        // Store user data in session for organization registration
        const pendingUser = {
          email,
          googleId,
          firstName,
          lastName,
          profilePicture,
          isGoogleAuth: true,
        };

        logger.info('New Google user needs organization registration', { email });
        return done(null, { isPending: true, pendingUser });

      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session storage
passport.serializeUser((user, done) => {
  if (user.isPending) {
    // For pending users (need org registration)
    done(null, { isPending: true, pendingUser: user.pendingUser });
  } else {
    // For authenticated users
    done(null, {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });
  }
});

// Deserialize user from session
passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (sessionUser.isPending) {
      // Return pending user data
      return done(null, sessionUser);
    }

    // Fetch full user data for authenticated users
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            status: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn('User not found during session deserialization', {
        userId: sessionUser.id,
      });
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    logger.error('Session deserialization error:', error);
    done(error, null);
  }
});

export default passport;
