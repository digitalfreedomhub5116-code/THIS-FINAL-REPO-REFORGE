/**
 * inventory.ts — Server-authoritative cosmetic inventory management.
 * All cosmetic ownership is stored in the `user_inventory` table.
 * Purchases are atomic: gold deducted + inventory row created in one flow.
 */
import { Router, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

/**
 * Server-side store price catalog.
 * Mirrors prices from utils/storeItems.ts so the server never trusts client prices.
 * If an item is NOT in this map, we fall back to DB lookup (store_outfits table).
 *
 * KEEP IN SYNC with utils/storeItems.ts — every purchasable item must be listed here.
 */
const STORE_PRICES: Record<string, number> = {
  // ── Borders: ELEMENTS ──
  'border-ice-img': 600,
  'border-starcrown-img': 900,
  'border-elemental-tide': 2800,
  'border-frost-tech': 8900,
  // ── Borders: BEASTS ──
  'border-dragon-img': 1200,
  'border-stitched-dragon': 3600,
  'border-gold-lion': 4800,
  'border-gold-dragon': 5500,
  'border-gold-eagle': 6200,
  'border-phoenix': 7400,
  // ── Borders: SHIELDS ──
  'border-podium-bronze': 1200,
  'border-streak-silver': 1500,
  'border-shadowthrone-img': 1500,
  'border-podium-silver': 1800,
  'border-streak-legendary': 2200,
  // ── Borders: EXCLUSIVE ──
  'border-streak-gold': 3000,
  'border-podium-gold': 3500,
  'border-streak-inferno': 5000,
  'border-streak-eternal': 7500,
  // ── Themes ──
  'theme-default': 0,
  'theme-crimson': 100,
  'theme-emerald': 100,
  'theme-sapphire': 100,
  'theme-amber': 100,
  'theme-rose': 100,
  'theme-violet': 100,
  'theme-ocean': 100,
  'theme-silver': 100,
  'theme-dusty-rose': 100,
  'theme-sage': 100,
  'theme-lavender': 100,
  'theme-powder-blue': 100,
  'theme-sand': 100,
  'theme-carbon': 200,
  'theme-platinum': 200,
  'theme-obsidian': 200,
  'theme-chrome': 200,
  'theme-aurora': 400,
  'theme-neon': 400,
  'theme-solar': 400,
  'theme-cosmic': 400,
  'theme-winter': 150,
  'theme-spring': 150,
  'theme-summer': 150,
  'theme-autumn': 150,
  'theme-grad-inferno': 600,
  'theme-grad-ocean': 600,
  'theme-grad-aurora': 600,
  'theme-grad-sunset': 600,
  'theme-grad-toxic': 600,
  // ── Consumables ──
  'boost-2x': 75,
  'boost-3x': 150,
  'streak-shield': 100,
  'scan-token': 50,
  'spotlight': 200,
  // ── Titles ──
  'title-grinder': 100,
  'title-sigma': 150,
  'title-beast': 200,
  'title-ascended': 300,
  'title-elite': 500,
  // ── Banners ──
  'banner-reforge-default': 0,
  'banner-mclaren': 300,
  'banner-noenemies': 250,
  'banner-porsche': 350,
  'banner-fineshyt': 300,
  'banner-shadowmonarch': 500,
  'banner-igris': 450,
  'banner-chahaein': 350,
  'banner-getup': 300,
  'banner-keepgoing': 400,
  // ── Streak Banners (free milestone rewards) ──
  'banner-streak-7day': 0,
  'banner-streak-14day': 0,
  'banner-streak-30day': 0,
  'banner-streak-60day': 0,
  'banner-streak-100day': 0,
  'banner-streak-365day': 0,
};

// Max discount % any daily deal can offer (anti-cheat ceiling)
const MAX_DEAL_DISCOUNT = 40;

// ── GET / — Load full inventory for the authenticated player ──
router.get('/', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = supabaseServer() as any;

    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const { data: items, error: invErr } = await db
      .from('user_inventory')
      .select('item_id, item_type, price_paid, source, purchased_at')
      .eq('player_id', player.id)
      .order('purchased_at', { ascending: true });

    if (invErr) throw invErr;

    return res.json({ items: items || [] });
  } catch (err) {
    console.error('[Inventory GET]', err);
    return res.status(500).json({ error: 'Failed to load inventory' });
  }
});

// ── POST /purchase — Atomic cosmetic purchase (gold deduct + inventory insert) ──
router.post('/purchase', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { itemId, itemType, price } = req.body;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid itemId' });
  }
  if (!itemType || !['border', 'banner', 'outfit', 'theme', 'consumable', 'title'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid itemType' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  // SERVER-SIDE PRICE VALIDATION
  let catalogPrice = STORE_PRICES[itemId] ?? -1;

  try {
    const db = supabaseServer() as any;

    // For items not in the server catalog (e.g. outfits), look up DB price
    if (catalogPrice < 0 && itemType === 'outfit') {
      const { data: outfitRow } = await db
        .from('store_outfits')
        .select('cost')
        .eq('id', itemId)
        .single();
      if (outfitRow) {
        catalogPrice = outfitRow.cost ?? 0;
      }
    }

    // Dynamic price lookup for remote store items (admin-added borders/banners)
    if (catalogPrice < 0 && itemId.startsWith('remote-')) {
      const { data: remoteItem } = await db
        .from('remote_store_items')
        .select('price, is_active')
        .eq('item_id', itemId)
        .single();

      if (remoteItem && remoteItem.is_active) {
        catalogPrice = remoteItem.price;
      } else {
        return res.status(400).json({ error: 'Remote item not available or inactive' });
      }
    }

    if (catalogPrice < 0) {
      return res.status(400).json({ error: 'Unknown item' });
    }

    // Allow deal discounts up to MAX_DEAL_DISCOUNT% off catalog price
    const minAllowedPrice = Math.round(catalogPrice * (1 - MAX_DEAL_DISCOUNT / 100));

    if (price < minAllowedPrice) {
      console.warn(`[Inventory] Price too low for ${itemId}: client=${price}, min=${minAllowedPrice}`);
      return res.status(400).json({ error: 'Price mismatch' });
    }

    const finalPrice = price;

    // 1. Get player
    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id, gold')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 2. Check if already owned
    const { data: existing } = await db
      .from('user_inventory')
      .select('id')
      .eq('player_id', player.id)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Item already owned', alreadyOwned: true });
    }

    // 3. Check gold
    const currentGold = player.gold || 0;
    if (currentGold < finalPrice) {
      return res.status(402).json({
        error: 'Not enough gold',
        goldRemaining: currentGold,
        goldRequired: finalPrice,
      });
    }

    // 4. Atomic: Deduct gold with optimistic concurrency + count check
    const newGold = currentGold - finalPrice;
    const { data: updateResult, error: goldErr } = await db
      .from('players')
      .update({ gold: newGold })
      .eq('id', player.id)
      .eq('gold', currentGold) // optimistic lock
      .select('id');

    if (goldErr) {
      console.error('[Inventory] Gold deduction failed:', goldErr);
      return res.status(500).json({ error: 'Gold deduction failed' });
    }
    if (!updateResult || updateResult.length === 0) {
      console.warn(`[Inventory] Optimistic lock failed for ${userId.slice(-8)}`);
      return res.status(409).json({ error: 'Gold changed — please try again' });
    }

    // 5. Insert into inventory
    const { error: insertErr } = await db
      .from('user_inventory')
      .insert({
        player_id: player.id,
        item_id: itemId,
        item_type: itemType,
        price_paid: finalPrice,
        source: 'purchase',
      });

    if (insertErr) {
      // Rollback gold
      console.error('[Inventory] Insert failed, rolling back gold:', insertErr);
      await db.from('players').update({ gold: currentGold }).eq('id', player.id);
      return res.status(500).json({ error: 'Purchase failed — gold refunded' });
    }

    console.log(`[Inventory] ${userId.slice(-8)}: Purchased ${itemId} (${itemType}) for ${finalPrice}G → ${newGold}G remaining`);
    return res.json({ success: true, gold: newGold, itemId, itemType });
  } catch (err) {
    console.error('[Inventory purchase]', err);
    return res.status(500).json({ error: 'Purchase failed' });
  }
});

// ── POST /equip — Equip a cosmetic (validates ownership first) ──
router.post('/equip', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { itemType, itemId } = req.body;

  if (!itemType || !['border', 'banner', 'outfit', 'theme', 'consumable', 'title'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid itemType' });
  }

  try {
    const db = supabaseServer() as any;

    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Validate ownership if equipping (not un-equipping)
    if (itemId) {
      const { data: owned } = await db
        .from('user_inventory')
        .select('id')
        .eq('player_id', player.id)
        .eq('item_id', itemId)
        .single();

      if (!owned) {
        return res.status(403).json({ error: 'Item not owned' });
      }
    }

    // Update the equipped field
    if (itemType === 'border') {
      await db.from('players')
        .update({ equipped_border: itemId || null, updated_at: new Date().toISOString() })
        .eq('id', player.id);
    } else if (itemType === 'outfit') {
      const { data: current } = await db
        .from('players')
        .select('raw_data')
        .eq('id', player.id)
        .single();
      const rawData = current?.raw_data || {};
      rawData.equippedOutfitId = itemId || 'outfit_starter';
      await db.from('players')
        .update({ raw_data: rawData, updated_at: new Date().toISOString() })
        .eq('id', player.id);
    } else if (itemType === 'banner') {
      const { data: current } = await db
        .from('players')
        .select('raw_data')
        .eq('id', player.id)
        .single();
      const rawData = current?.raw_data || {};
      rawData.equippedBanner = itemId || 'banner-reforge-default';
      await db.from('players')
        .update({ raw_data: rawData, updated_at: new Date().toISOString() })
        .eq('id', player.id);
    }

    console.log(`[Inventory] ${userId.slice(-8)}: Equipped ${itemType} → ${itemId || 'none'}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Inventory equip]', err);
    return res.status(500).json({ error: 'Equip failed' });
  }
});

// ── POST /migrate — Client sends localStorage-owned items for one-time migration ──
router.post('/migrate', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ migrated: 0 });
  }

  try {
    const db = supabaseServer() as any;

    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    let migrated = 0;
    for (const item of items) {
      if (!item.itemId || !item.itemType) continue;
      if (!['border', 'banner', 'outfit', 'theme'].includes(item.itemType)) continue;

      const { error } = await db
        .from('user_inventory')
        .insert({
          player_id: player.id,
          item_id: item.itemId,
          item_type: item.itemType,
          price_paid: 0,
          source: 'migration',
        });

      if (!error) migrated++;
      // Silently skip duplicates (UNIQUE constraint)
    }

    console.log(`[Inventory] ${userId.slice(-8)}: Migrated ${migrated} items from localStorage`);
    return res.json({ migrated });
  } catch (err) {
    console.error('[Inventory migrate]', err);
    return res.status(500).json({ error: 'Migration failed' });
  }
});

export default router;
