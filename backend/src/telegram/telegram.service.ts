import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

interface Session {
  workspaceId: string;
  workspaceName: string;
  currency: string;
  customerId: string | null;
  stage: 'awaiting_name' | 'awaiting_phone' | 'idle';
  pendingName?: string;
  cart: Record<string, number>; // productId -> quantity
}

/**
 * Customer-facing ordering channel over Telegram — no app install needed,
 * which matters a lot for first-time smartphone users who are wary of
 * installing yet another app but already have Telegram. Complements (does
 * not replace) the field-agent mobile app: orders placed here show up
 * exactly like agent-collected ones, just with `Order.source = 'TELEGRAM'`
 * and no agent assigned yet — any field agent can claim one for delivery
 * from the "unclaimed orders" list (`GET /orders/unclaimed`) the same way
 * they'd start any other delivery.
 *
 * Deep-link flow: a business shares `https://t.me/<your_bot>?start=<workspace-slug>`
 * (on a flyer, a WhatsApp/Telegram broadcast, a sticker on the delivery
 * crate, etc.). Whoever taps it lands in a chat pre-scoped to that
 * business.
 *
 * KNOWN LIMITATIONS (by design, for MVP scope):
 *  - One Telegram account can only be a bot-customer of ONE workspace at a
 *    time (`Customer.telegramChatId` is globally unique, not per-workspace).
 *    Fine for "I order water from one distributor"; would need a schema
 *    change (`@@unique([workspaceId, telegramChatId])`) to support a
 *    customer ordering from multiple Simuni businesses via the same bot.
 *  - Session state (name/phone/cart in progress) lives in memory and resets
 *    if the server restarts mid-conversation. Fine for an MVP; move to
 *    Redis (already a dependency — `ioredis`) if that becomes a problem.
 *  - No staff-side Telegram notification on a new order yet — staff see it
 *    by checking the app (`GET /orders/unclaimed`). A natural next step is
 *    notifying a configured staff chat ID per workspace.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private sessions = new Map<string, Session>(); // keyed by Telegram chat id

  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram ordering channel disabled');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);

    try {
      // Long polling — simplest to run in dev/small deployments (no public
      // HTTPS endpoint needed). For production at scale, switch to
      // `bot.telegram.setWebhook(...)` and a controller route instead;
      // nothing else in this file would need to change.
      await this.bot.launch();
      this.logger.log('Telegram bot started (long polling)');
    } catch (err) {
      this.logger.error(`Telegram bot failed to start: ${(err as Error).message}`);
      this.bot = null;
    }
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  private session(chatId: string): Session | undefined {
    return this.sessions.get(chatId);
  }

  private registerHandlers(bot: Telegraf) {
    bot.start(async (ctx) => {
      const chatId = String(ctx.chat.id);
      const slug = (ctx.startPayload || '').trim();

      if (!slug) {
        await ctx.reply(
          "👋 Welcome to Simuni ordering!\n\nTo order from a specific business, use the ordering link they shared with you (it looks like t.me/<bot>?start=<business>).",
        );
        return;
      }

      const workspace = await this.prisma.organization.findUnique({ where: { slug } });
      if (!workspace) {
        await ctx.reply("Sorry, I couldn't find that business. Please check the link and try again.");
        return;
      }

      const currency = JSON.parse(workspace.metadata || '{}').currency || 'ETB';
      const existingCustomer = await this.customersService.findByTelegramChatId(chatId);

      this.sessions.set(chatId, {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        currency,
        customerId: existingCustomer?.id ?? null,
        stage: existingCustomer ? 'idle' : 'awaiting_name',
        cart: {},
      });

      if (existingCustomer) {
        await ctx.reply(`Welcome back to ${workspace.name}, ${existingCustomer.name}! 👋`);
        await this.sendMenu(ctx, chatId);
      } else {
        await ctx.reply(
          `👋 Welcome to ${workspace.name} on Simuni!\n\nLet's get you set up — what's your name?`,
        );
      }
    });

    bot.command('menu', async (ctx) => this.sendMenu(ctx, String(ctx.chat.id)));
    bot.command('cart', async (ctx) => this.sendCartSummary(ctx, String(ctx.chat.id)));
    bot.command('help', async (ctx) =>
      ctx.reply('/menu — browse products\n/cart — view your current order\n/start — begin again'),
    );

    // Plain-text messages: only meaningful during the name/phone registration steps.
    bot.on('text', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const session = this.session(chatId);
      if (!session) {
        await ctx.reply('Please tap a business ordering link to get started (see /help).');
        return;
      }

      if (session.stage === 'awaiting_name') {
        session.pendingName = ctx.message.text.trim();
        session.stage = 'awaiting_phone';
        await ctx.reply(
          'Thanks! And your phone number? (You can type it, or share your contact.)',
          Markup.keyboard([Markup.button.contactRequest('📱 Share my phone number')])
            .oneTime()
            .resize(),
        );
        return;
      }

      if (session.stage === 'awaiting_phone') {
        await this.completeRegistration(ctx, chatId, session, ctx.message.text.trim());
        return;
      }

      // Otherwise, nudge them toward the menu rather than silently ignoring.
      await ctx.reply('Use /menu to see products, or /cart to review your order.');
    });

    bot.on('contact', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const session = this.session(chatId);
      if (session?.stage === 'awaiting_phone') {
        await this.completeRegistration(ctx, chatId, session, ctx.message.contact.phone_number);
      }
    });

    bot.action(/^add:(.+)$/, async (ctx) => {
      const chatId = String(ctx.chat?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (!session) return ctx.answerCbQuery('Session expired — send /start again.');

      const productId = ctx.match[1];
      session.cart[productId] = (session.cart[productId] || 0) + 1;
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      await ctx.answerCbQuery(`Added ${product?.name ?? 'item'} (×${session.cart[productId]})`);
    });

    bot.action('checkout', async (ctx) => {
      await ctx.answerCbQuery();
      if (ctx.chat?.id) await this.sendCartSummary(ctx, String(ctx.chat.id));
    });

    bot.action('confirm_order', async (ctx) => {
      const chatId = String(ctx.chat?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (!session || Object.keys(session.cart).length === 0) {
        await ctx.answerCbQuery('Your cart is empty.');
        return;
      }
      if (!session.customerId) {
        await ctx.answerCbQuery('Something went wrong — send /start again.');
        return;
      }

      const items = Object.entries(session.cart).map(([productId, quantity]) => ({ productId, quantity }));
      const order = await this.ordersService.createFromTelegram(session.workspaceId, session.customerId, items);
      const total = this.ordersService.orderTotal(order as any);

      session.cart = {};
      await ctx.answerCbQuery('Order placed!');
      await ctx.editMessageText(
        `✅ Order placed with ${session.workspaceName}!\n\nTotal: ${session.currency} ${total.toFixed(2)}\n\nA delivery agent will be assigned soon. Use /menu to order again anytime.`,
      );
    });

    bot.action('cancel_order', async (ctx) => {
      const chatId = String(ctx.chat?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (session) session.cart = {};
      await ctx.answerCbQuery('Cancelled');
      await ctx.editMessageText('Order cancelled. Use /menu to start again.');
    });
  }

  private async completeRegistration(ctx: any, chatId: string, session: Session, phone: string) {
    const customer = await this.customersService.registerFromTelegram(
      session.workspaceId,
      chatId,
      session.pendingName || 'Telegram Customer',
      phone,
    );
    session.customerId = customer.id;
    session.stage = 'idle';
    await ctx.reply(`Thanks, ${customer.name}! You're all set. 🎉`, Markup.removeKeyboard());
    await this.sendMenu(ctx, chatId);
  }

  private async sendMenu(ctx: any, chatId: string) {
    const session = this.session(chatId);
    if (!session) return ctx.reply('Please tap a business ordering link first (see /help).');

    const products = await this.productsService.findAll(session.workspaceId);
    if (products.length === 0) {
      await ctx.reply("This business hasn't added any products yet — check back soon.");
      return;
    }

    const buttons = products.map((p) => [
      Markup.button.callback(`${p.name} — ${session.currency} ${Number(p.price).toFixed(2)}`, `add:${p.id}`),
    ]);
    buttons.push([Markup.button.callback('🛒 View Cart & Checkout', 'checkout')]);

    await ctx.reply(`📋 ${session.workspaceName} — tap a product to add it to your cart:`, Markup.inlineKeyboard(buttons));
  }

  private async sendCartSummary(ctx: any, chatId: string) {
    const session = this.session(chatId);
    if (!session || Object.keys(session.cart).length === 0) {
      await ctx.reply('Your cart is empty. Use /menu to add products.');
      return;
    }

    const lines: string[] = [];
    let total = 0;
    for (const [productId, qty] of Object.entries(session.cart)) {
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      const lineTotal = Number(product.price) * qty;
      total += lineTotal;
      lines.push(`${product.name} × ${qty} — ${session.currency} ${lineTotal.toFixed(2)}`);
    }

    await ctx.reply(
      `🛒 Your order:\n\n${lines.join('\n')}\n\nTotal: ${session.currency} ${total.toFixed(2)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirm Order', 'confirm_order')],
        [Markup.button.callback('❌ Cancel', 'cancel_order')],
      ]),
    );
  }
}
