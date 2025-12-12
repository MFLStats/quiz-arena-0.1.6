import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity } from "./entities";
import { MatchEntity, QueueEntity, QuestionEntity, CategoryEntity, ReportEntity, CodeRegistryEntity, ConfigEntity, ShopEntity } from "./game-entities";
import { ok, bad, notFound, isStr, Index } from './core-utils';
import type { FinishMatchResponse, MatchHistoryItem, UpdateUserRequest, PurchaseItemRequest, EquipItemRequest, UnequipItemRequest, RegisterRequest, LoginEmailRequest, LoginRequest, User, RewardBreakdown, ShopItem, UserAchievement, Question, BulkImportRequest, Category, ClaimRewardRequest, UpgradeSeasonPassRequest, CreateReportRequest, Report, JoinMatchRequest, SystemConfig, SystemStats, ChallengeRequest, Notification, ClearNotificationsRequest } from "@shared/types";
import { MOCK_CATEGORIES, MOCK_QUESTIONS } from "@shared/mock-data";
import { PROGRESSION_CONSTANTS, getLevelFromXp, getXpRequiredForNextLevel } from "@shared/progression";
import { SEASON_REWARDS_CONFIG as SHARED_SEASON_CONFIG, SEASON_COST } from "@shared/constants";
// --- Helpers ---
async function generateUserId(email: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `u_${hashHex.substring(0, 16)}`;
}
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function sanitizeUser(user: User): User {
  const { passwordHash, ...rest } = user;
  return rest;
}
function publicSanitizeUser(user: User): Partial<User> {
  // Remove sensitive or private data for public viewing
  const { passwordHash, email, inventory, friends, notifications, ...rest } = user;
  return rest;
}
async function isAdmin(env: Env, userId: string): Promise<boolean> {
  if (userId === 'Crushed' || userId === 'Greeky') return true;
  const userEntity = new UserEntity(env, userId);
  if (await userEntity.exists()) {
    const user = await userEntity.getState();
    return user.name === 'Crushed' || user.name === 'Greeky';
  }
  return false;
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'Quiz Arena API' }}));
  // --- AUTH ---
  app.post('/api/auth/register', async (c) => {
    try {
      const { name, email, password, avatar, country } = await c.req.json() as RegisterRequest;
      if (!name || !email || !password) return bad(c, 'Missing required fields');
      if (password.length < 6) return bad(c, 'Password must be at least 6 characters');
      const normalizedEmail = email.toLowerCase().trim();
      const userId = await generateUserId(normalizedEmail);
      const userEntity = new UserEntity(c.env, userId);
      if (await userEntity.exists()) {
        return bad(c, 'User already exists with this email');
      }
      const hashedPassword = await hashPassword(password);
      const avatarSeed = normalizedEmail.split('@')[0];
      const defaultAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`;
      const finalAvatar = avatar || defaultAvatar;
      const newUser: User = {
        id: userId,
        name,
        email: normalizedEmail,
        provider: 'email',
        passwordHash: hashedPassword,
        elo: 1200,
        categoryElo: {},
        country: country || 'US',
        friends: [],
        currency: 1000,
        inventory: [],
        history: [],
        stats: { wins: 0, losses: 0, matches: 0 },
        avatar: finalAvatar,
        xp: 0,
        level: 1,
        loginStreak: 1,
        lastLogin: new Date().toISOString().split('T')[0],
        achievements: [],
        seasonPass: {
          level: 1,
          xp: 0,
          isPremium: false,
          claimedRewards: []
        },
        activityMap: {},
        notifications: []
      };
      await UserEntity.create(c.env, newUser);
      console.log(`[AUTH] Registered new user: ${userId} (${normalizedEmail})`);
      return ok(c, sanitizeUser(newUser));
    } catch (e) {
      console.error('[AUTH] Registration failed:', e);
      return bad(c, 'Registration failed');
    }
  });
  app.post('/api/auth/login-email', async (c) => {
    try {
      const { email, password } = await c.req.json() as LoginEmailRequest;
      if (!email || !password) return bad(c, 'Missing required fields');
      const normalizedEmail = email.toLowerCase().trim();
      const userId = await generateUserId(normalizedEmail);
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) {
        console.warn(`[AUTH] Login failed: User not found for ${normalizedEmail} (ID: ${userId})`);
        return bad(c, 'Invalid credentials');
      }
      const user = await userEntity.getState();
      if (!user.passwordHash) {
        console.warn(`[AUTH] Login failed: No password set for ${normalizedEmail} (Provider: ${user.provider})`);
        return bad(c, 'Account exists but has no password. Please use social login.');
      }
      const hashedPassword = await hashPassword(password);
      if (user.passwordHash !== hashedPassword) {
        console.warn(`[AUTH] Login failed: Password mismatch for ${normalizedEmail}`);
        return bad(c, 'Invalid credentials');
      }
      await userEntity.processLogin();
      console.log(`[AUTH] Login successful: ${userId}`);
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[AUTH] Login error:', e);
      return bad(c, 'Login failed due to server error');
    }
  });
  app.post('/api/auth/login', async (c) => {
    const { provider, email } = await c.req.json() as LoginRequest;
    if (!provider) return bad(c, 'Provider required');
    let id: string;
    let name: string;
    let avatarSeed: string;
    let userEmail = email ? email.toLowerCase().trim() : undefined;
    if (provider === 'guest') {
      id = crypto.randomUUID();
      name = `Guest ${id.substring(0, 4)}`;
      avatarSeed = id;
    } else {
      // Legacy simulation fallback if needed, but real OAuth routes are below
      if (userEmail) {
        id = await generateUserId(userEmail);
        name = userEmail.split('@')[0];
        avatarSeed = userEmail;
      } else {
        if (provider === 'google') {
          id = 'user_demo_google';
          name = 'Google Player';
          avatarSeed = 'google_avatar';
        } else {
          id = 'user_demo_apple';
          name = 'Apple Player';
          avatarSeed = 'apple_avatar';
        }
      }
    }
    const userEntity = new UserEntity(c.env, id);
    if (await userEntity.exists()) {
      await userEntity.processLogin();
      return ok(c, sanitizeUser(await userEntity.getState()));
    }
    const avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`;
    const user = await UserEntity.create(c.env, {
      id,
      name,
      email: userEmail,
      provider,
      elo: 1200,
      categoryElo: {},
      country: 'US',
      friends: [],
      currency: 1000,
      inventory: [],
      history: [],
      stats: { wins: 0, losses: 0, matches: 0 },
      avatar,
      xp: 0,
      level: 1,
      loginStreak: 1,
      lastLogin: new Date().toISOString().split('T')[0],
      achievements: [],
      seasonPass: {
        level: 1,
        xp: 0,
        isPremium: false,
        claimedRewards: []
      },
      activityMap: {},
      notifications: []
    });
    return ok(c, sanitizeUser(user));
  });
  // --- REAL OAUTH ROUTES ---
  // Google
  app.get('/api/auth/google/redirect', (c) => {
    const env = c.env as any;
    const clientId = env.GOOGLE_CLIENT_ID;
    // Graceful fallback for preview/dev environments
    if (!clientId) {
        return c.redirect('/login?error=missing_env&provider=google');
    }
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    return c.redirect(url);
  });
  app.get('/api/auth/google/callback', async (c) => {
    const code = c.req.query('code');
    const error = c.req.query('error');
    if (error) return c.redirect(`/?error=${error}`);
    if (!code) return c.redirect(`/?error=no_code`);
    const env = c.env as any;
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
    try {
      // Exchange code
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
          })
      });
      const tokenData: any = await tokenResponse.json();
      if (tokenData.error) return c.redirect(`/?error=${tokenData.error}`);
      // Get User Info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData: any = await userResponse.json();
      const email = userData.email;
      const name = userData.name || email.split('@')[0];
      const picture = userData.picture;
      const userId = await generateUserId(email);
      const userEntity = new UserEntity(c.env, userId);
      if (await userEntity.exists()) {
        await userEntity.processLogin();
        // Update avatar if it's the default one or missing
        await userEntity.mutate(u => ({
            ...u,
            avatar: u.avatar && u.avatar.includes('dicebear') ? picture : u.avatar,
            provider: 'google' // Link provider
        }));
      } else {
        // Create new user
        const newUser: User = {
            id: userId,
            name,
            email,
            provider: 'google',
            elo: 1200,
            categoryElo: {},
            country: 'US',
            friends: [],
            currency: 1000,
            inventory: [],
            history: [],
            stats: { wins: 0, losses: 0, matches: 0 },
            avatar: picture || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userId}`,
            xp: 0,
            level: 1,
            loginStreak: 1,
            lastLogin: new Date().toISOString().split('T')[0],
            achievements: [],
            seasonPass: { level: 1, xp: 0, isPremium: false, claimedRewards: [] },
            activityMap: {},
            notifications: []
        };
        await UserEntity.create(c.env, newUser);
      }
      const frontendUrl = new URL(c.req.url).origin + '/auth/callback';
      return c.redirect(`${frontendUrl}?userId=${userId}`);
    } catch (err: any) {
      console.error("Google OAuth Error:", err);
      return c.redirect(`/?error=oauth_failed`);
    }
  });
  // Apple
  app.get('/api/auth/apple/redirect', (c) => {
    const env = c.env as any;
    const clientId = env.APPLE_CLIENT_ID;
    // Graceful fallback for preview/dev environments
    if (!clientId) {
        return c.redirect('/login?error=missing_env&provider=apple');
    }
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/apple/callback`;
    const scope = 'name email';
    const state = crypto.randomUUID(); // Should ideally be stored and verified
    const url = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&response_mode=form_post&state=${state}`;
    return c.redirect(url);
  });
  app.post('/api/auth/apple/callback', async (c) => {
    // Apple sends data as form_post
    const body = await c.req.parseBody();
    const code = body['code'];
    const userJson = body['user']; // Only sent on first login
    const error = body['error'];
    if (error) return c.redirect(`/?error=${error}`);
    if (!code) return c.redirect(`/?error=no_code`);
    // NOTE: Full Apple Sign-In requires generating a client_secret JWT signed with a P8 key.
    // This is complex to do in a Worker without external crypto libraries (like jose/jsonwebtoken).
    // For this demo environment, we cannot easily complete the token exchange without those deps.
    // We will redirect with a specific error message to inform the user.
    return c.redirect(`/?error=apple_signin_requires_jwt_config`);
  });
  // --- USERS ---
  app.get('/api/users', async (c) => {
    try {
      await UserEntity.ensureSeed(c.env);
      const cq = c.req.query('cursor');
      const lq = c.req.query('limit');
      const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
      page.items = page.items.map(sanitizeUser);
      return ok(c, page);
    } catch (e) {
      console.error('[API] Error listing users:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.get('/api/users/search', async (c) => {
    try {
      const query = c.req.query('query')?.toLowerCase();
      if (!query || query.length < 2) return ok(c, []);
      // Note: In a real production app with millions of users, we would use a proper search index (e.g. D1 or external).
      // For this Durable Object setup, we scan the user index.
      const { items } = await UserEntity.list(c.env, null, 1000);
      const matches = items.filter(u => u.name.toLowerCase().includes(query));
      // Return sanitized public profiles
      return ok(c, matches.map(publicSanitizeUser));
    } catch (e) {
      console.error('[API] Search error:', e);
      return c.json({ success: false, error: 'Search failed' }, 500);
    }
  });
  app.get('/api/users/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const requesterId = c.req.query('requesterId');
      const userEntity = new UserEntity(c.env, id);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const user = await userEntity.getState();
      // If the requester is the user themselves, return full data (sanitized of password)
      if (requesterId === id) {
        return ok(c, sanitizeUser(user));
      }
      // Otherwise return public profile
      return ok(c, publicSanitizeUser(user));
    } catch (e) {
      console.error(`[API] Error fetching user ${c.req.param('id')}:`, e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.put('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    const updates = await c.req.json() as UpdateUserRequest;
    const userEntity = new UserEntity(c.env, id);
    if (!await userEntity.exists()) return notFound(c, 'User not found');
    // Use explicit undefined checks to allow clearing fields (e.g. setting frame to "")
    await userEntity.mutate(user => ({
      ...user,
      name: updates.name !== undefined ? updates.name : user.name,
      country: updates.country !== undefined ? updates.country : user.country,
      avatar: updates.avatar !== undefined ? updates.avatar : user.avatar,
      banner: updates.banner !== undefined ? updates.banner : user.banner,
      title: updates.title !== undefined ? updates.title : user.title,
      frame: updates.frame !== undefined ? updates.frame : user.frame,
      frameConfig: updates.frameConfig !== undefined ? updates.frameConfig : user.frameConfig
    }));
    return ok(c, sanitizeUser(await userEntity.getState()));
  });
  app.post('/api/users/:id/friends', async (c) => {
    const id = c.req.param('id');
    const { friendId } = await c.req.json() as { friendId?: string };
    if (!friendId) return bad(c, 'friendId required');
    if (id === friendId) return bad(c, 'Cannot add self as friend');
    const userEntity = new UserEntity(c.env, id);
    const friendEntity = new UserEntity(c.env, friendId);
    if (!await userEntity.exists()) return notFound(c, 'User not found');
    if (!await friendEntity.exists()) return notFound(c, 'Friend not found');
    await userEntity.mutate(user => {
      const friends = user.friends || [];
      if (friends.includes(friendId)) return user;
      return { ...user, friends: [...friends, friendId] };
    });
    await friendEntity.mutate(user => {
      const friends = user.friends || [];
      if (friends.includes(id)) return user;
      return { ...user, friends: [...friends, id] };
    });
    return ok(c, { success: true });
  });
  app.get('/api/users/:id/friends', async (c) => {
    try {
      const id = c.req.param('id');
      const userEntity = new UserEntity(c.env, id);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const user = await userEntity.getState();
      const friendIds = user.friends || [];
      const friendsResults = await Promise.all(
        friendIds.map(async fid => {
          try {
            const fEntity = new UserEntity(c.env, fid);
            if (!await fEntity.exists()) return null;
            const f = await fEntity.getState();
            return publicSanitizeUser(f); // Always return public profile for friends list
          } catch (err) {
            console.error(`[API] Failed to fetch friend ${fid}:`, err);
            return null;
          }
        })
      );
      const friends = friendsResults.filter((f): f is Partial<User> => f !== null);
      return ok(c, friends);
    } catch (e) {
      console.error(`[API] Error fetching friends for ${c.req.param('id')}:`, e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.delete('/api/users/:id', async (c) => {
    const targetId = c.req.param('id');
    const requesterId = c.req.query('userId');
    if (!requesterId) return bad(c, 'requesterId required');
    const admin = await isAdmin(c.env, requesterId);
    const isSelf = targetId === requesterId;
    if (!isSelf && !admin) {
        return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const existed = await UserEntity.delete(c.env, targetId);
    if (!existed) return notFound(c, 'User not found');
    return ok(c, { success: true });
  });
  // --- SHOP ---
  app.get('/api/shop/items', async (c) => {
    await ShopEntity.ensureSeed(c.env);
    const { items, next } = await ShopEntity.list(c.env, null, 100);
    return ok(c, { items, next });
  });
  app.post('/api/admin/shop/items', async (c) => {
    const userId = c.req.query('userId');
    if (!userId || !await isAdmin(c.env, userId)) return c.json({ success: false, error: 'Unauthorized' }, 403);
    const newItem = await c.req.json() as ShopItem;
    if (!newItem.name || !newItem.type || !newItem.price) return bad(c, 'Missing required fields');
    const id = newItem.id || crypto.randomUUID();
    await ShopEntity.create(c.env, { ...newItem, id });
    return ok(c, { success: true });
  });
  app.put('/api/admin/shop/items/:id', async (c) => {
    const userId = c.req.query('userId');
    const itemId = c.req.param('id');
    if (!userId || !await isAdmin(c.env, userId)) return c.json({ success: false, error: 'Unauthorized' }, 403);
    const updates = await c.req.json() as Partial<ShopItem>;
    const shopEntity = new ShopEntity(c.env, itemId);
    if (!await shopEntity.exists()) return notFound(c, 'Item not found');
    await shopEntity.patch(updates);
    return ok(c, { success: true });
  });
  app.delete('/api/admin/shop/items/:id', async (c) => {
    const userId = c.req.query('userId');
    const itemId = c.req.param('id');
    if (!userId || !await isAdmin(c.env, userId)) return c.json({ success: false, error: 'Unauthorized' }, 403);
    const existed = await ShopEntity.delete(c.env, itemId);
    if (!existed) return notFound(c, 'Item not found');
    return ok(c, { success: true });
  });
  app.post('/api/admin/reset-shop', async (c) => {
    const userId = c.req.query('userId');
    if (!userId || !await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    try {
      await ShopEntity.reset(c.env);
      return ok(c, { success: true });
    } catch (e) {
      console.error('[API] Shop reset failed:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.post('/api/shop/purchase', async (c) => {
    try {
      const { userId, itemId } = await c.req.json() as PurchaseItemRequest;
      if (!userId || !itemId) return bad(c, 'userId and itemId required');
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const shopEntity = new ShopEntity(c.env, itemId);
      if (!await shopEntity.exists()) return notFound(c, 'Item not found');
      const item = await shopEntity.getState();
      const user = await userEntity.getState();
      if ((user.currency || 0) < item.price) return bad(c, 'Insufficient funds');
      let itemToAwardId = itemId;
      if (item.type === 'box') {
        // Fetch all items to build pool
        const { items: allItems } = await ShopEntity.list(c.env, null, 1000);
        let pool: ShopItem[] = [];
        if (item.rarity === 'common') {
          pool = allItems.filter(i => i.type !== 'box' && (i.rarity === 'common' || i.rarity === 'rare'));
        } else if (item.rarity === 'rare') {
          pool = allItems.filter(i => i.type !== 'box' && (i.rarity === 'rare' || i.rarity === 'epic'));
        } else {
          pool = allItems.filter(i => i.type !== 'box' && (i.rarity === 'epic' || i.rarity === 'legendary'));
        }
        const unowned = pool.filter(i => !user.inventory?.includes(i.id));
        const targetPool = unowned.length > 0 ? unowned : pool;
        if (targetPool.length > 0) {
          const randomItem = targetPool[Math.floor(Math.random() * targetPool.length)];
          itemToAwardId = randomItem.id;
        }
      } else {
        if (user.inventory?.includes(itemId)) return bad(c, 'Item already owned');
      }
      await userEntity.mutate(u => ({
        ...u,
        currency: (u.currency || 0) - item.price,
        inventory: Array.from(new Set([...(u.inventory || []), itemToAwardId]))
      }));
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[API] Purchase error:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.post('/api/shop/equip', async (c) => {
    try {
      const { userId, itemId, type } = await c.req.json() as EquipItemRequest;
      if (!userId || !itemId || !type) return bad(c, 'Missing required fields');
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const user = await userEntity.getState();
      if (!user.inventory?.includes(itemId)) return bad(c, 'Item not owned');
      const shopEntity = new ShopEntity(c.env, itemId);
      if (!await shopEntity.exists()) return notFound(c, 'Item not found');
      const item = await shopEntity.getState();
      if (item.type !== type) return bad(c, 'Item type mismatch');
      await userEntity.mutate(u => ({
        ...u,
        avatar: type === 'avatar' ? item.assetUrl : u.avatar,
        banner: type === 'banner' ? item.assetUrl : u.banner,
        title: type === 'title' ? item.name : u.title,
        frame: type === 'frame' ? item.assetUrl : u.frame
      }));
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[API] Equip error:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.post('/api/shop/unequip', async (c) => {
    try {
      const { userId, type } = await c.req.json() as UnequipItemRequest;
      if (!userId || !type) return bad(c, 'Missing required fields');
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      await userEntity.mutate(u => {
        const updates: Partial<User> = {};
        if (type === 'frame') updates.frame = undefined;
        if (type === 'banner') updates.banner = undefined;
        if (type === 'title') updates.title = undefined;
        return { ...u, ...updates };
      });
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[API] Unequip error:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  // --- SEASON PASS ---
  app.post('/api/shop/season/claim', async (c) => {
    try {
      const { userId, level, track } = await c.req.json() as ClaimRewardRequest;
      if (!userId || !level || !track) return bad(c, 'Missing required fields');
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const user = await userEntity.getState();
      const seasonPass = user.seasonPass || { level: 1, xp: 0, isPremium: false, claimedRewards: [] };
      if ((user.level || 1) < level) {
        return bad(c, 'Level requirement not met');
      }
      if (track === 'premium' && !seasonPass.isPremium) {
        return bad(c, 'Premium pass required');
      }
      const claimKey = `${level}:${track}`;
      if (seasonPass.claimedRewards.includes(claimKey)) {
        return bad(c, 'Reward already claimed');
      }
      const rewardConfig = SHARED_SEASON_CONFIG.find(r => r.level === level);
      if (!rewardConfig) return bad(c, 'Invalid level');
      const reward = track === 'free' ? rewardConfig.free : rewardConfig.premium;
      if (reward.type === 'none') return bad(c, 'No reward at this level');
      let currencyToAdd = 0;
      const inventoryToAdd: string[] = [];
      if (reward.type === 'coins') {
        currencyToAdd = reward.amount || 0;
      } else if (reward.itemId) {
        inventoryToAdd.push(reward.itemId);
      }
      await userEntity.mutate(u => ({
        ...u,
        currency: (u.currency || 0) + currencyToAdd,
        inventory: Array.from(new Set([...(u.inventory || []), ...inventoryToAdd])),
        seasonPass: {
          ...seasonPass,
          claimedRewards: [...seasonPass.claimedRewards, claimKey]
        }
      }));
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[API] Claim reward error:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  app.post('/api/shop/season/upgrade', async (c) => {
    try {
      const { userId } = await c.req.json() as UpgradeSeasonPassRequest;
      if (!userId) return bad(c, 'userId required');
      const userEntity = new UserEntity(c.env, userId);
      if (!await userEntity.exists()) return notFound(c, 'User not found');
      const user = await userEntity.getState();
      const seasonPass = user.seasonPass || { level: 1, xp: 0, isPremium: false, claimedRewards: [] };
      if (seasonPass.isPremium) {
        return bad(c, 'Already premium');
      }
      if ((user.currency || 0) < SEASON_COST) {
        return bad(c, 'Insufficient funds');
      }
      await userEntity.mutate(u => ({
        ...u,
        currency: (u.currency || 0) - SEASON_COST,
        seasonPass: {
          ...seasonPass,
          isPremium: true
        }
      }));
      return ok(c, sanitizeUser(await userEntity.getState()));
    } catch (e) {
      console.error('[API] Season upgrade error:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  // --- LEADERBOARD ---
  app.get('/api/leaderboard', async (c) => {
    try {
      await UserEntity.ensureSeed(c.env);
      const { items } = await UserEntity.list(c.env, null, 50);
      const sorted = items.map(publicSanitizeUser).sort((a, b) => (b.elo || 0) - (a.elo || 0));
      return ok(c, sorted);
    } catch (e) {
      console.error('[API] Error fetching leaderboard:', e);
      return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
  });
  // --- CATEGORIES ---
  app.get('/api/categories', async (c) => {
    let dynamicCategories: Category[] = [];
    try {
      const { items } = await CategoryEntity.list(c.env, null, 1000);
      dynamicCategories = items;
    } catch (e) {
      console.error("Failed to fetch dynamic categories", e);
    }
    // Merge logic: Dynamic overrides Mock
    const categoryMap = new Map<string, Category>();
    // 1. Add Mocks
    MOCK_CATEGORIES.forEach(cat => categoryMap.set(cat.id, cat));
    // 2. Add/Override with Dynamic
    dynamicCategories.forEach(cat => categoryMap.set(cat.id, cat));
    return ok(c, Array.from(categoryMap.values()));
  });
  // --- MATCHMAKING & GAME ---
  app.post('/api/queue/join', async (c) => {
    const { userId, categoryId } = await c.req.json() as { userId?: string, categoryId?: string };
    if (!userId || !categoryId) return bad(c, 'userId and categoryId required');
    const queueEntity = new QueueEntity(c.env, `queue:${categoryId}`);
    const matchId = await queueEntity.join(userId, categoryId);
    return ok(c, { matchId });
  });
  app.post('/api/queue/leave', async (c) => {
    const { userId, categoryId } = await c.req.json() as { userId?: string, categoryId?: string };
    if (!userId || !categoryId) return bad(c, 'userId and categoryId required');
    const queueEntity = new QueueEntity(c.env, `queue:${categoryId}`);
    await queueEntity.leave(userId);
    return ok(c, { success: true });
  });
  app.get('/api/queue/status', async (c) => {
    const userId = c.req.query('userId');
    const categoryId = c.req.query('categoryId');
    if (!userId || !categoryId) return bad(c, 'userId and categoryId required');
    const queueEntity = new QueueEntity(c.env, `queue:${categoryId}`);
    const matchId = await queueEntity.getAssignment(userId);
    return ok(c, { matchId });
  });
  app.post('/api/match/start', async (c) => {
    const { userId, categoryId } = await c.req.json() as { userId?: string, categoryId?: string };
    if (!userId || !categoryId) return bad(c, 'userId and categoryId required');
    const matchId = crypto.randomUUID();
    const matchEntity = new MatchEntity(c.env, matchId);
    const matchState = await matchEntity.startMatch([userId], categoryId, 'ranked');
    return ok(c, matchState);
  });
  app.post('/api/daily/start', async (c) => {
    const { userId } = await c.req.json() as { userId?: string };
    if (!userId) return bad(c, 'userId required');
    const matchId = crypto.randomUUID();
    const matchEntity = new MatchEntity(c.env, matchId);
    const matchState = await matchEntity.startMatch([userId], 'daily', 'daily');
    return ok(c, matchState);
  });
  // --- PRIVATE MATCHES ---
  app.post('/api/match/private/create', async (c) => {
    const { userId, categoryId } = await c.req.json() as { userId?: string, categoryId?: string };
    if (!userId || !categoryId) return bad(c, 'userId and categoryId required');
    const matchId = crypto.randomUUID();
    const matchEntity = new MatchEntity(c.env, matchId);
    const matchState = await matchEntity.startMatch([userId], categoryId, 'ranked', true);
    const registry = new CodeRegistryEntity(c.env, 'global');
    try {
      const code = await registry.register(matchId);
      await matchEntity.mutate(s => ({ ...s, code }));
      return ok(c, { ...matchState, code });
    } catch (e) {
      console.error("Failed to register code", e);
      return bad(c, "Failed to create private lobby");
    }
  });
  app.post('/api/match/private/join', async (c) => {
    const { userId, code } = await c.req.json() as JoinMatchRequest;
    if (!userId || !code) return bad(c, 'userId and code required');
    const registry = new CodeRegistryEntity(c.env, 'global');
    const matchId = await registry.lookup(code);
    if (!matchId) return notFound(c, 'Invalid room code');
    const matchEntity = new MatchEntity(c.env, matchId);
    if (!await matchEntity.exists()) return notFound(c, 'Match expired');
    try {
      const matchState = await matchEntity.joinMatch(userId);
      return ok(c, matchState);
    } catch (e: any) {
      return bad(c, e.message || "Failed to join match");
    }
  });
  app.post('/api/match/:id/join', async (c) => {
    const matchId = c.req.param('id');
    const { userId } = await c.req.json() as { userId: string };
    if (!userId) return bad(c, 'userId required');
    const matchEntity = new MatchEntity(c.env, matchId);
    if (!await matchEntity.exists()) return notFound(c, 'Match not found');
    try {
      const matchState = await matchEntity.joinMatch(userId);
      return ok(c, matchState);
    } catch (e: any) {
      return bad(c, e.message || "Failed to join match");
    }
  });
  app.post('/api/match/:id/answer', async (c) => {
    const matchId = c.req.param('id');
    const { userId, questionIndex, answerIndex, timeRemainingMs } = await c.req.json() as any;
    if (!userId || questionIndex === undefined || answerIndex === undefined) {
      return bad(c, 'Missing required fields');
    }
    const matchEntity = new MatchEntity(c.env, matchId);
    if (!await matchEntity.exists()) return notFound(c, 'Match not found');
    const result = await matchEntity.submitAnswer(userId, questionIndex, answerIndex, timeRemainingMs || 0);
    return ok(c, result);
  });
  app.post('/api/match/:id/emote', async (c) => {
    const matchId = c.req.param('id');
    const { userId, emoji } = await c.req.json() as { userId: string, emoji: string };
    if (!userId || !emoji) return bad(c, 'Missing required fields');
    const matchEntity = new MatchEntity(c.env, matchId);
    if (!await matchEntity.exists()) return notFound(c, 'Match not found');
    await matchEntity.submitEmote(userId, emoji);
    return ok(c, { success: true });
  });
  app.post('/api/match/:id/finish', async (c) => {
    const matchId = c.req.param('id');
    const { userId } = await c.req.json() as { userId?: string };
    if (!userId) return bad(c, 'userId required');
    const matchEntity = new MatchEntity(c.env, matchId);
    if (!await matchEntity.exists()) return notFound(c, 'Match not found');
    const matchState = await matchEntity.getState();
    const myStats = matchState.players[userId];
    if (!myStats) return bad(c, 'User not in match');
    const opponentId = Object.keys(matchState.players).find(id => id !== userId);
    const opponentStats = opponentId ? matchState.players[opponentId] : null;
    const opponentScore = opponentStats?.score || 0;
    const won = myStats.score > opponentScore;
    const draw = myStats.score === opponentScore;
    const isDaily = matchState.mode === 'daily';
    const xpBreakdown: RewardBreakdown[] = [];
    const coinsBreakdown: RewardBreakdown[] = [];
    let totalXp = 0;
    let totalCoins = 0;
    let correctCount = 0;
    let fastCount = 0;
    myStats.answers.forEach(ans => {
      if (ans.correct) {
        correctCount++;
        totalXp += PROGRESSION_CONSTANTS.XP_PER_CORRECT_ANSWER;
        totalCoins += PROGRESSION_CONSTANTS.COINS_PER_CORRECT_ANSWER;
        if (ans.timeMs < 5000) {
           if (ans.timeMs < 5000) {
             fastCount++;
             totalXp += PROGRESSION_CONSTANTS.XP_PER_FAST_ANSWER;
             totalCoins += PROGRESSION_CONSTANTS.COINS_PER_FASTEST_ANSWER;
           }
        }
      }
    });
    if (correctCount > 0) {
      xpBreakdown.push({ source: 'Correct Answers', amount: correctCount * PROGRESSION_CONSTANTS.XP_PER_CORRECT_ANSWER });
      coinsBreakdown.push({ source: 'Correct Answers', amount: correctCount * PROGRESSION_CONSTANTS.COINS_PER_CORRECT_ANSWER });
    }
    if (fastCount > 0) {
      xpBreakdown.push({ source: 'Speed Bonus', amount: fastCount * PROGRESSION_CONSTANTS.XP_PER_FAST_ANSWER });
      coinsBreakdown.push({ source: 'Speed Bonus', amount: fastCount * PROGRESSION_CONSTANTS.COINS_PER_FASTEST_ANSWER });
    }
    if (correctCount === matchState.questions.length) {
      totalXp += PROGRESSION_CONSTANTS.XP_PER_PERFECT_ROUND;
      xpBreakdown.push({ source: 'Perfect Round', amount: PROGRESSION_CONSTANTS.XP_PER_PERFECT_ROUND });
    }
    if (won) {
      totalXp += PROGRESSION_CONSTANTS.XP_MATCH_WIN;
      totalCoins += PROGRESSION_CONSTANTS.COINS_MATCH_WIN;
      xpBreakdown.push({ source: 'Victory Bonus', amount: PROGRESSION_CONSTANTS.XP_MATCH_WIN });
      coinsBreakdown.push({ source: 'Victory Bonus', amount: PROGRESSION_CONSTANTS.COINS_MATCH_WIN });
    } else if (draw) {
      totalXp += PROGRESSION_CONSTANTS.XP_MATCH_DRAW;
      totalCoins += PROGRESSION_CONSTANTS.COINS_MATCH_DRAW;
      xpBreakdown.push({ source: 'Draw Bonus', amount: PROGRESSION_CONSTANTS.XP_MATCH_DRAW });
      coinsBreakdown.push({ source: 'Draw Bonus', amount: PROGRESSION_CONSTANTS.COINS_MATCH_DRAW });
    } else {
      totalXp += PROGRESSION_CONSTANTS.XP_MATCH_LOSS;
      totalCoins += PROGRESSION_CONSTANTS.COINS_MATCH_LOSS;
      xpBreakdown.push({ source: 'Participation', amount: PROGRESSION_CONSTANTS.XP_MATCH_LOSS });
      coinsBreakdown.push({ source: 'Participation', amount: PROGRESSION_CONSTANTS.COINS_MATCH_LOSS });
    }
    const eloChange = isDaily ? 0 : (won ? 12 : (draw ? 0 : -8));
    const userEntity = new UserEntity(c.env, userId);
    let newElo = 1200;
    let levelUp = false;
    let newLevel = 1;
    const newAchievements: string[] = [];
    await userEntity.mutate(user => {
      newElo = user.elo + eloChange;
      const currentXp = user.xp || 0;
      const currentLevel = user.level || 1;
      const updatedXp = currentXp + totalXp;
      const { level: calculatedLevel } = getLevelFromXp(updatedXp);
      if (calculatedLevel > currentLevel) {
        levelUp = true;
        newLevel = calculatedLevel;
        const levelDiff = calculatedLevel - currentLevel;
        const levelUpCoins = levelDiff * PROGRESSION_CONSTANTS.COINS_LEVEL_UP;
        totalCoins += levelUpCoins;
        coinsBreakdown.push({ source: 'Level Up Bonus', amount: levelUpCoins });
      } else {
        newLevel = currentLevel;
      }
      const stats = user.stats || { wins: 0, losses: 0, matches: 0 };
      stats.matches += 1;
      if (won) stats.wins += 1;
      else if (!draw) stats.losses += 1;
      const historyItem: MatchHistoryItem = {
        matchId,
        opponentName: isDaily ? 'Daily Challenge' : (opponentStats?.name || 'Opponent'),
        result: won ? 'win' : (draw ? 'draw' : 'loss'),
        score: myStats.score,
        opponentScore,
        eloChange,
        timestamp: Date.now()
      };
      const history = [historyItem, ...(user.history || [])].slice(0, 20);
      const categoryId = matchState.categoryId;
      const currentCategoryElo = user.categoryElo?.[categoryId] ?? 1200;
      const newCategoryElo = {
        ...(user.categoryElo || {}),
        [categoryId]: currentCategoryElo + eloChange
      };
      let dailyStats = user.dailyStats;
      let title = user.title;
      const today = new Date().toISOString().split('T')[0];
      if (isDaily) {
        if (!dailyStats || dailyStats.date !== today || myStats.score > dailyStats.score) {
          dailyStats = { date: today, score: myStats.score };
        }
        if (myStats.score >= 500 && title !== 'Daily Challenge Winner') {
          title = 'Daily Challenge Winner';
        }
      }
      const activityMap = user.activityMap || {};
      const newActivityCount = (activityMap[today] || 0) + 1;
      const newActivityMap = { ...activityMap, [today]: newActivityCount };
      const currentAchievements = user.achievements || [];
      const unlockedIds = new Set(currentAchievements.map(a => a.achievementId));
      const addAchievement = (id: string) => {
        if (!unlockedIds.has(id)) {
          newAchievements.push(id);
          currentAchievements.push({ achievementId: id, unlockedAt: Date.now() });
          unlockedIds.add(id);
        }
      };
      if (won && stats.wins === 1) addAchievement('first_win');
      if (fastCount >= 3) addAchievement('speed_demon');
      if (correctCount === matchState.questions.length) addAchievement('perfect_round');
      if (stats.matches >= 50) addAchievement('veteran');
      if ((user.currency || 0) + totalCoins >= 5000) addAchievement('high_roller');
      if (won && history.length >= 3) {
        const last3 = history.slice(0, 3);
        if (last3.every(h => h.result === 'win')) {
          addAchievement('streaker');
        }
      }
      return {
        ...user,
        elo: newElo,
        categoryElo: newCategoryElo,
        stats,
        history,
        currency: (user.currency || 0) + totalCoins,
        xp: updatedXp,
        level: newLevel,
        dailyStats,
        title,
        achievements: currentAchievements,
        activityMap: newActivityMap,
        seasonPass: {
          ...(user.seasonPass || { isPremium: false, claimedRewards: [] }),
          level: newLevel,
          xp: updatedXp
        }
      };
    });
    const response: FinishMatchResponse = {
      matchId,
      won,
      score: myStats.score,
      opponentScore,
      eloChange,
      newElo,
      reactionTimes: myStats.answers.map((a, i) => ({ question: i + 1, time: a.timeMs })),
      xpEarned: totalXp,
      coinsEarned: totalCoins,
      xpBreakdown,
      coinsBreakdown,
      levelUp,
      newLevel,
      newAchievements,
      isPrivate: matchState.isPrivate,
      categoryId: matchState.categoryId,
      answers: myStats.answers,
      questions: matchState.questions
    };
    return ok(c, response);
  });
  app.get('/api/match/:id', async (c) => {
    const matchEntity = new MatchEntity(c.env, c.req.param('id'));
    if (!await matchEntity.exists()) return notFound(c, 'Match not found');
    await matchEntity.processTurn();
    return ok(c, await matchEntity.getState());
  });
  // --- CHALLENGES ---
  app.post('/api/challenge', async (c) => {
    const { userId, opponentId, categoryId } = await c.req.json() as ChallengeRequest & { userId: string };
    if (!userId || !opponentId || !categoryId) return bad(c, 'Missing fields');
    // 1. Create Match
    const matchId = crypto.randomUUID();
    const matchEntity = new MatchEntity(c.env, matchId);
    const matchState = await matchEntity.startMatch([userId], categoryId, 'ranked', true); // Private match
    // Register code for consistency
    const registry = new CodeRegistryEntity(c.env, 'global');
    const code = await registry.register(matchId);
    await matchEntity.mutate(s => ({ ...s, code }));
    matchState.code = code;
    // 2. Get User Info for Notification
    const userEntity = new UserEntity(c.env, userId);
    const user = await userEntity.getState();
    // 3. Send Notification to Opponent
    const opponentEntity = new UserEntity(c.env, opponentId);
    if (!await opponentEntity.exists()) return notFound(c, 'Opponent not found');
    const notification: Notification = {
      id: crypto.randomUUID(),
      type: 'challenge',
      fromUserId: userId,
      fromUserName: user.name,
      matchId,
      categoryId,
      categoryName: categoryId, // Frontend can resolve this or we can fetch it
      timestamp: Date.now()
    };
    await opponentEntity.addNotification(notification);
    return ok(c, matchState);
  });
  app.get('/api/notifications', async (c) => {
    const userId = c.req.query('userId');
    if (!userId) return bad(c, 'userId required');
    const userEntity = new UserEntity(c.env, userId);
    if (!await userEntity.exists()) return ok(c, []);
    const user = await userEntity.getState();
    return ok(c, user.notifications || []);
  });
  app.post('/api/notifications/clear', async (c) => {
    const { userId, notificationIds } = await c.req.json() as ClearNotificationsRequest & { userId: string };
    if (!userId || !notificationIds) return bad(c, 'Missing fields');
    const userEntity = new UserEntity(c.env, userId);
    await userEntity.clearNotifications(notificationIds);
    return ok(c, { success: true });
  });
  // --- ADMIN ROUTES ---
  app.post('/api/admin/questions', async (c) => {
    const { userId, question } = await c.req.json() as { userId: string, question: Partial<Question> };
    if (!userId || !question) return bad(c, 'Missing required fields');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    if (!question.text || !question.options || !question.categoryId) {
      return bad(c, 'Invalid question data');
    }
    const id = crypto.randomUUID();
    const newQuestion: Question = {
      id,
      categoryId: question.categoryId,
      text: question.text,
      options: question.options,
      correctIndex: question.correctIndex ?? 0,
      media: question.media
    };
    await QuestionEntity.createQuestion(c.env, newQuestion);
    return ok(c, newQuestion);
  });
  app.put('/api/admin/questions/:id', async (c) => {
    const userId = c.req.query('userId');
    const questionId = c.req.param('id');
    const updates = await c.req.json() as Partial<Question>;
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    if (Object.keys(updates).length === 0) {
        return bad(c, 'No updates provided');
    }
    try {
        const updatedQuestion = await QuestionEntity.updateQuestion(c.env, questionId, updates);
        return ok(c, updatedQuestion);
    } catch (e: any) {
        console.error(`Failed to update question ${questionId}:`, e);
        return bad(c, e.message || 'Failed to update question');
    }
  });
  app.post('/api/admin/questions/bulk', async (c) => {
    const { userId, questions, targetCategory } = await c.req.json() as BulkImportRequest;
    if (!userId || !questions || !Array.isArray(questions) || !targetCategory) return bad(c, 'Missing required fields');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    let categoryId = '';
    if (targetCategory.mode === 'existing') {
      if (!targetCategory.id) return bad(c, 'Category ID required for existing mode');
      categoryId = targetCategory.id;
    } else {
      if (!targetCategory.create) return bad(c, 'Category details required for new mode');
      const newId = `cat_${crypto.randomUUID().substring(0, 8)}`;
      const newCategory: Category = {
        id: newId,
        name: targetCategory.create.name,
        group: targetCategory.create.group,
        icon: targetCategory.create.icon || 'Atom',
        color: targetCategory.create.color || 'from-indigo-500 to-purple-500',
        description: 'Community created category',
        baseElo: 1200
      };
      await CategoryEntity.create(c.env, newCategory);
      categoryId = newId;
    }
    const questionsToCreate: Question[] = [];
    for (const q of questions) {
        if (!q.text || !q.options || !Array.isArray(q.options)) continue;
        const id = crypto.randomUUID();
        questionsToCreate.push({
            id,
            categoryId: categoryId,
            text: q.text,
            options: q.options,
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            media: q.media
        });
    }
    await QuestionEntity.createBatch(c.env, questionsToCreate);
    return ok(c, { count: questionsToCreate.length, categoryId });
  });
  app.get('/api/admin/questions', async (c) => {
    const userId = c.req.query('userId');
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const limitParam = c.req.query('limit');
    const limit = limitParam ? Math.min(1000, Math.max(1, parseInt(limitParam))) : 1000;
    const search = c.req.query('search')?.toLowerCase();
    const categoryId = c.req.query('categoryId');
    // Fetch dynamic questions
    const { items: dynamicQuestions } = await QuestionEntity.list(c.env, null, limit);
    // Merge with Mocks (Dynamic overrides Mock)
    const questionMap = new Map<string, Question>();
    MOCK_QUESTIONS.forEach(q => questionMap.set(q.id, q));
    dynamicQuestions.forEach(q => questionMap.set(q.id, q));
    let allQuestions = Array.from(questionMap.values());
    // Filter
    if (categoryId) {
        allQuestions = allQuestions.filter(q => q.categoryId === categoryId);
    }
    if (search) {
        allQuestions = allQuestions.filter(q =>
            q.text.toLowerCase().includes(search) ||
            q.id.toLowerCase().includes(search) ||
            q.categoryId.toLowerCase().includes(search)
        );
    }
    return ok(c, allQuestions.slice(0, limit));
  });
  app.delete('/api/admin/questions/:id', async (c) => {
    const userId = c.req.query('userId');
    const questionId = c.req.param('id');
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const existed = await QuestionEntity.delete(c.env, questionId);
    // Return success even if it didn't exist as a dynamic entity (effectively resetting/deleting)
    return ok(c, { success: true, wasOverridden: existed });
  });
  app.delete('/api/admin/categories/:id', async (c) => {
    const userId = c.req.query('userId');
    const categoryId = c.req.param('id');
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const existed = await CategoryEntity.delete(c.env, categoryId);
    return ok(c, { success: true, wasOverridden: existed });
  });
  app.put('/api/admin/categories/:id', async (c) => {
    const userId = c.req.query('userId');
    const categoryId = c.req.param('id');
    const updates = await c.req.json() as Partial<Category>;
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const categoryEntity = new CategoryEntity(c.env, categoryId);
    const exists = await categoryEntity.exists();
    await categoryEntity.mutate(cat => ({
      ...cat,
      ...updates,
      id: categoryId // Ensure ID is set
    }));
    if (!exists) {
        // If it was a new override, ensure it's indexed
        const idx = new Index<string>(c.env, CategoryEntity.indexName);
        await idx.add(categoryId);
    }
    return ok(c, await categoryEntity.getState());
  });
  app.post('/api/reports', async (c) => {
    const { userId, questionId, questionText, reason } = await c.req.json() as CreateReportRequest & { userId: string };
    if (!userId || !questionId || !reason) return bad(c, 'Missing required fields');
    const userEntity = new UserEntity(c.env, userId);
    let reporterName = 'Anonymous';
    if (await userEntity.exists()) {
      const user = await userEntity.getState();
      reporterName = user.name;
    }
    const reportId = crypto.randomUUID();
    const report: Report = {
      id: reportId,
      questionId,
      questionText: questionText || 'Unknown Question',
      userId,
      reporterName,
      reason,
      timestamp: Date.now()
    };
    await ReportEntity.create(c.env, report);
    return ok(c, report);
  });
  app.get('/api/admin/reports', async (c) => {
    const userId = c.req.query('userId');
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const { items } = await ReportEntity.list(c.env, null, 100);
    const sorted = items.sort((a, b) => b.timestamp - a.timestamp);
    return ok(c, sorted);
  });
  app.delete('/api/admin/reports/:id', async (c) => {
    const userId = c.req.query('userId');
    const reportId = c.req.param('id');
    if (!userId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, userId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const existed = await ReportEntity.delete(c.env, reportId);
    if (!existed) return notFound(c, 'Report not found');
    return ok(c, { success: true });
  });
  app.get('/api/config', async (c) => {
    const configEntity = new ConfigEntity(c.env, 'global');
    return ok(c, await configEntity.getState());
  });
  app.put('/api/admin/config', async (c) => {
    const userId = c.req.query('userId');
    if (!userId || !await isAdmin(c.env, userId)) return c.json({ success: false, error: 'Unauthorized' }, 403);
    const updates = await c.req.json() as SystemConfig;
    const configEntity = new ConfigEntity(c.env, 'global');
    await configEntity.mutate(s => ({ ...s, ...updates }));
    return ok(c, await configEntity.getState());
  });
  app.get('/api/admin/users', async (c) => {
    const requesterId = c.req.query('userId');
    const search = c.req.query('search')?.toLowerCase();
    if (!requesterId) return bad(c, 'userId required');
    if (!await isAdmin(c.env, requesterId)) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }
    const { items } = await UserEntity.list(c.env, null, 100);
    let filtered = items.map(sanitizeUser);
    if (search) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search) ||
        (u.email && u.email.toLowerCase().includes(search))
      );
    }
    return ok(c, filtered);
  });
  app.get('/api/stats', async (c) => {
    const userIdx = new Index<string>(c.env, UserEntity.indexName);
    const { items: userIds } = await userIdx.page(null, 2000);
    const questionIdx = new Index<string>(c.env, QuestionEntity.indexName);
    const { items: questionIds } = await questionIdx.page(null, 2000);
    const categoryIdx = new Index<string>(c.env, CategoryEntity.indexName);
    const { items: categoryIds } = await categoryIdx.page(null, 200);
    const reportIdx = new Index<string>(c.env, ReportEntity.indexName);
    const { items: reportIds } = await reportIdx.page(null, 2000);
    const stats: SystemStats = {
        userCount: userIds.length,
        questionCount: questionIds.length + MOCK_QUESTIONS.length,
        categoryCount: categoryIds.length + MOCK_CATEGORIES.length,
        reportCount: reportIds.length
    };
    return ok(c, stats);
  });
  app.get('/api/admin/stats', async (c) => {
    const userId = c.req.query('userId');
    if (!userId || !await isAdmin(c.env, userId)) return c.json({ success: false, error: 'Unauthorized' }, 403);
    const userIdx = new Index<string>(c.env, UserEntity.indexName);
    const { items: userIds } = await userIdx.page(null, 2000);
    const questionIdx = new Index<string>(c.env, QuestionEntity.indexName);
    const { items: questionIds } = await questionIdx.page(null, 2000);
    const categoryIdx = new Index<string>(c.env, CategoryEntity.indexName);
    const { items: categoryIds } = await categoryIdx.page(null, 200);
    const reportIdx = new Index<string>(c.env, ReportEntity.indexName);
    const { items: reportIds } = await reportIdx.page(null, 2000);
    const stats: SystemStats = {
        userCount: userIds.length,
        questionCount: questionIds.length + MOCK_QUESTIONS.length,
        categoryCount: categoryIds.length + MOCK_CATEGORIES.length,
        reportCount: reportIds.length
    };
    return ok(c, stats);
  });
}