import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

type Language = 'en' | 'am' | 'om';

interface Session {
  workspaceId: string;
  workspaceName: string;
  currency: string;
  customerId: string | null;
  stage:
    | 'awaiting_language'
    | 'awaiting_name'
    | 'awaiting_phone'
    | 'awaiting_location'
    | 'awaiting_random_amount'
    | 'survey_shop_name'
    | 'survey_shop_category'
    | 'survey_shop_phone'
    | 'survey_shop_location'
    | 'survey_shop_name_quick'
    | 'agent_reg_name'
    | 'agent_reg_phone'
    | 'idle';
  pendingPhone?: string;
  language?: Language;
  pendingName?: string;
  cart: Record<string, number>;
  awaitingQuantityFor?: string;
  surveyShopName?: string;
  surveyShopCategory?: string;
  surveyShopPhone?: string;
  agentPendingName?: string;
  quickRegisterCoords?: { lat: number; lng: number };
}

const CATEGORIES: Record<string, { labelEn: string; labelAm: string; labelOm: string }> = {
  RETAIL_SHOP: { labelEn: '🏪 Retail Shop', labelAm: '🏪 ሱቅ / ግሮሰሪ', labelOm: '🏪 Suuqii' },
  KIOSK: { labelEn: '🛒 Kiosk / Kantina', labelAm: '🛒 ኪዮስክ / ካንቲና', labelOm: '🛒 Kiyooskii' },
  SUPERMARKET: { labelEn: '🏬 Supermarket', labelAm: '🏬 ሱፐርማርኬት', labelOm: '🏬 Suppermaarkeetii' },
  WHOLESALER: { labelEn: '📦 Wholesaler', labelAm: '📦 ጅምላ ሻጭ', labelOm: '📦 Daldalaa Jimlaa' },
  HORECA: { labelEn: '🍽️ Hotel / Cafe / Restaurant', labelAm: '🍽️ ሆቴል / ካፌ', labelOm: '🍽️ Hoteela / Kaaffee' },
  OTHER: { labelEn: '📍 Other Location', labelAm: '📍 ሌላ ቦታ', labelOm: '📍 Bakka Biraa' },
};

const i18n = {
  en: {
    selectLang: 'Please choose your language:',
    welcome: (workspace: string) => `👋 Welcome to ${workspace} on Simuni!\n\nLet's get you set up - what's your name?`,
    askPhone: 'Thanks! And your phone number? (You can type it, or share your contact.)',
    sharePhoneBtn: '📱 Share my phone number',
    askLocation: 'Could you share your location so we can deliver to you? (Or type "skip")',
    shareLocationBtn: '📍 Share my location',
    welcomeBack: (workspace: string, name: string) => `Welcome back to ${workspace}, ${name}! 👋`,
    invalidNumber: 'Please enter a valid number (e.g., 10).',
    addedToCart: (qty: number, item: string, unit: string) => `Added ${qty} ${unit}(s) of ${item} to your cart! ✅`,
    useMenu: 'Use /menu to see products, or /cart to review your order.',
    howMany: (item: string, unit: string) => `You selected **${item}**.\n\nHow many ${unit}s do you want? (Type a number below)`,
    cartEmpty: 'Your cart is empty. Use /menu to add products.',
    emptyStore: "This business hasn't added any products yet - check back soon.",
    viewCart: '🛒 View Cart & Checkout',
    randomAssortment: '🎲 Random Assortment',
    askAmount: 'How much ETB would you like to spend on the random assortment?',
    amountInvalid: 'Please enter a valid number greater than 0.',
    selectProduct: (workspace: string) => `📦 ${workspace} - tap a product to select it:`,
    yourOrder: '🛒 Your order:',
    total: 'Total',
    confirmOrderBtn: '✅ Confirm Order',
    cancelBtn: '❌ Cancel',
    orderPlaced: (workspace: string, currency: string, total: string) => `✅ Order placed with ${workspace}!\n\nTotal: ${currency} ${total}\n\nA delivery agent will be assigned soon. Use /menu to order again anytime.`,
    orderCancelled: 'Order cancelled. Use /menu to start again.',
    allSet: (name: string) => `Thanks, ${name}! You're all set. 🎉`,
    changeLanguage: '🌐 Change Language',
    sessionExpired: 'Session expired - send /start again.',
    emptyPayload: 'Please tap a business ordering link to get started (see /help).',
    // Sales Person Survey Keys
    surveyStartPrompt: '🏪 *[Step 1/3] Register New Shop*\n\nPlease enter the Shop or Business Name:\n_(e.g., "Selam Grocery" or "Abyssinia Mart")_\n\nType /cancel anytime to exit.',
    surveyCategoryPrompt: (name: string) => `🏷️ *[Step 2/3] Choose Category for "${name}":*`,
    surveyPhonePrompt: '📞 *[Step 2/3] Shop Owner Phone Number*\n\nType the owner\'s phone (e.g. `0911223344`), or tap **⏩ Skip** below:',
    skipPhoneBtn: '⏩ Skip Phone Number',
    surveyLocationPrompt: (name: string) => `📍 *[Final Step] Share GPS Location*\n\nPlease tap the button below to share the exact GPS location for *${name}*:`,
    shareShopLocationBtn: '📍 Share Shop GPS Location',
    surveyCancelled: '❌ Process cancelled.',
    // Sales Person User Registration
    agentRegPrompt: '👤 *Register as Field Sales Person*\n\nPlease enter your Full Name:\n_(e.g. "Dawit Kebede")_',
    agentPhonePrompt: '📱 Please share or enter your phone number to link your sales account:',
  },
  am: {
    selectLang: 'እባክዎ ቋንቋዎን ይምረጡ፡',
    welcome: (workspace: string) => `👋 እንኳን ወደ ${workspace} በደህና መጡ!\n\nእባክዎ ስምዎን ያስገቡ - ስምዎ ማን ነው?`,
    askPhone: 'እናመሰግናለን! ስልክ ቁጥርዎስ? (መፃፍ ወይም አድራሻዎን ማጋራት ይችላሉ)',
    sharePhoneBtn: '📱 ስልክ ቁጥሬን አጋራ',
    askLocation: 'እባክዎ ያሉበትን ቦታ ያጋሩን? (ወይም "skip" ይበሉ)',
    shareLocationBtn: '📍 ቦታዬን አጋራ',
    welcomeBack: (workspace: string, name: string) => `እንኳን በደህና ተመለሱ ወደ ${workspace}, ${name}! 👋`,
    invalidNumber: 'እባክዎ ትክክለኛ ቁጥር ያስገቡ (ለምሳሌ 10)።',
    addedToCart: (qty: number, item: string, unit: string) => `${qty} ${unit} የ ${item} ወደ ዘንቢልዎ ታክሏል! ✅`,
    useMenu: 'ምርቶችን ለማየት /menu ይጠቀሙ፣ ወይም ትዕዛዝዎን ለማየት /cart ይጠቀሙ።',
    howMany: (item: string, unit: string) => `**${item}** መርጠዋል።\n\nስንት ${unit} ይፈልጋሉ? (ቁጥሩን ከታች ይፃፉ)`,
    cartEmpty: 'ዘንቢልዎ ባዶ ነው። ምርቶችን ለመጨመር /menu ይጠቀሙ።',
    emptyStore: "ይህ ድርጅት እስካሁን ምንም ምርት አላከለም - በቅርቡ ይመለሱ።",
    viewCart: '🛒 ዘንቢል እና ክፍያን ይመልከቱ',
    randomAssortment: '🎲 የዘፈቀደ (Random)',
    askAmount: 'በዘፈቀደ ለሚመረጡት ምን ያህል ብር (ETB) ማውጣት ይፈልጋሉ?',
    amountInvalid: 'እባክዎ ከ 0 በላይ የሆነ ትክክለኛ ቁጥር ያስገቡ።',
    selectProduct: (workspace: string) => `📦 ${workspace} - ለመምረጥ አንዱን ይንኩ፡`,
    yourOrder: '🛒 የእርስዎ ትዕዛዝ፡',
    total: 'ድምር',
    confirmOrderBtn: '✅ ትዕዛዝ አረጋግጥ',
    cancelBtn: '❌ ሰርዝ',
    orderPlaced: (workspace: string, currency: string, total: string) => `✅ ትዕዛዝዎ ለ ${workspace} ተልኳል!\n\nድምር: ${currency} ${total}\n\nበቅርቡ አድራሽ ይመደብልዎታል። እንደገና ለማዘዝ /menu ይጠቀሙ።`,
    orderCancelled: 'ትዕዛዝዎ ተሰርዟል። እንደገና ለመጀመር /menu ይጠቀሙ።',
    allSet: (name: string) => `እናመሰግናለን, ${name}! ጨርሰናል። 🎉`,
    changeLanguage: '🌐 ቋንቋ ቀይር',
    sessionExpired: 'ጊዜው አልቋል - እባክዎ /start ብለው እንደገና ይጀምሩ።',
    emptyPayload: 'እባክዎ የድርጅት ማዘዣ ሊንክ ይጫኑ።',
    surveyStartPrompt: '🏪 *[ደረጃ 1/3] አዲስ ሱቅ መመዝገቢያ*\n\nእባክዎ የሱቁን ወይም የንግድ ቤቱን ስም ያስገቡ፡\n_(ለምሳሌ፦ "ሰላም ግሮሰሪ")_\n\nለማቋረጥ /cancel ይበሉ።',
    surveyCategoryPrompt: (name: string) => `🏷️ *[ደረጃ 2/3] የ "${name}" አይነት ይምረጡ፡*`,
    surveyPhonePrompt: '📞 *[ደረጃ 2/3] የባለቤቱ ስልክ ቁጥር*\n\nየባለቤቱን ስልክ ቁጥር ይፃፉ (ለምሳሌ፦ `0911223344`) ወይም ከታች ያለውን **⏩ እለፍ** የሚለውን በተን ይጫኑ፡',
    skipPhoneBtn: '⏩ እለፍ (ስልክ የለም)',
    surveyLocationPrompt: (name: string) => `📍 *[የመጨረሻ ደረጃ] የGPS ቦታ ማጋሪያ*\n\nእባክዎ ከታች ያለውን በተን በመንካት የ "${name}"ን ትክክለኛ ቦታ ያጋሩ፡`,
    shareShopLocationBtn: '📍 የሱቁን GPS ቦታ አጋራ',
    surveyCancelled: '❌ ተሰርዟል።',
    agentRegPrompt: '👤 *የሽያጭ ሰራተኛ ምዝገባ*\n\nእባክዎ ሙሉ ስምዎን ያስገቡ፡\n_(ለምሳሌ፦ "ዳዊት ከበደ")_',
    agentPhonePrompt: '📱 እባክዎ ስልክ ቁጥርዎን ያጋሩ ወይም ያስገቡ፡',
  },
  om: {
    selectLang: 'Maaloo afaan keessan filadhaa:',
    welcome: (workspace: string) => `👋 Baga nagaan gara ${workspace} dhuftan!\n\nMaqaan keessan eenyu?`,
    askPhone: 'Galatoomaa! Lakkoofsa bilbilaa keessan? (Barreessuu ykn share gochuu dandeessu.)',
    sharePhoneBtn: '📱 Lakkoofsa koo ergi',
    askLocation: 'Maaloo bakka jirtan nuuf ergaa (Ykn "skip" barreessaa)',
    shareLocationBtn: '📍 Bakka koo ergi',
    welcomeBack: (workspace: string, name: string) => `Baga nagaan deebitan gara ${workspace}, ${name}! 👋`,
    invalidNumber: 'Maaloo lakkoofsa sirrii galchaa (fkn: 10).',
    addedToCart: (qty: number, item: string, unit: string) => `${qty} ${unit} kan ${item} cart keessanitti dabalameera! ✅`,
    useMenu: 'Oomishoota ilaaluuf /menu, ykn ajaja keessan ilaaluuf /cart fayyadhaa.',
    howMany: (item: string, unit: string) => `**${item}** filattaniittu.\n\n${unit} meeqaa barbaaddu? (Lakkoofsa barreessaa)`,
    cartEmpty: 'Cart keessan duwwaadh. Oomishoota dabaluuf /menu fayyadhaa.',
    emptyStore: "Dhaabbanni kun ammatti oomisha hin daballe - dhiyootti deebi\'aa ilaalaa.",
    viewCart: '🛒 Cart fi Kaffaltii',
    randomAssortment: '🎲 Filannoo Adda Addaa (Random)',
    askAmount: 'Filannoo adda addaaf ETB meeqa baasuu barbaaddu?',
    amountInvalid: 'Maaloo lakkoofsa sirrii 0 ol ta\'e galchaa.',
    selectProduct: (workspace: string) => `📦 ${workspace} - Oomisha filachuuf tuqaa:`,
    yourOrder: '🛒 Ajaja keessan:',
    total: 'Waliigala',
    confirmOrderBtn: '✅ Ajaja Mirkaneessi',
    cancelBtn: '❌ Haqi',
    orderPlaced: (workspace: string, currency: string, total: string) => `✅ Ajajni keessan ${workspace} tiif ergameera!\n\nWaliigala: ${currency} ${total}\n\nYeroo dhiyootti nama geessu isiniif ramadama. Irra deebi\'uun ajajuuf /menu fayyadhaa.`,
    orderCancelled: 'Ajajni haqameera. Irra deebi\'uun jalqabuuf /menu fayyadhaa.',
    allSet: (name: string) => `Galatoomaa, ${name}! Xumurreerra. 🎉`,
    changeLanguage: '🌐 Afaan Jijjiiri',
    sessionExpired: 'Yeroon darbeera - /start irra deebi\'aa ergaa.',
    emptyPayload: 'Maaloo linkii ajaja dhaabbataa tuqaa.',
    surveyStartPrompt: '🏪 *[Sadarkaa 1/3] Suuqii Haaraa Galmeessuu*\n\nMaaloo maqaa suuqichaa galchaa:\n_(fkn: "Selam Grocery")_\n\nHaqquuf /cancel fayyadamaa.',
    surveyCategoryPrompt: (name: string) => `🏷️ *[Sadarkaa 2/3] Gosa "${name}" filadhaa:*`,
    surveyPhonePrompt: '📞 *[Sadarkaa 2/3] Lakkoofsa Bilbila Abbaa Suuqii*\n\nLakkoofsa bilbilaa barreessaa (fkn: `0911223344`), ykn furtuu **⏩ Darbi** tuqaa:',
    skipPhoneBtn: '⏩ Darbi (Bilbilli Hin Jiru)',
    surveyLocationPrompt: (name: string) => `📍 *[Sadarkaa Dhumaa] Bakka GPS Erguu*\n\nMaaloo bakka GPS "${name}" erguuf furtuu gadii tuqaa:`,
    shareShopLocationBtn: '📍 Bakka GPS Suuqichaa Ergi',
    surveyCancelled: '❌ Haqameera.',
    agentRegPrompt: '👤 *Galmee Hojjataa Gurgurtaa*\n\nMaaloo maqaa keessan guutuu galchaa:',
    agentPhonePrompt: '📱 Lakkoofsa bilbila keessanii ergaa:',
  },
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private sessions = new Map<string, Session>();

  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  private t(session: Session) {
    const lang = session.language || 'en';
    return i18n[lang];
  }

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not provided, Telegram bot disabled.');
      return;
    }

    try {
      this.bot = new Telegraf(token);

      // Top-level error boundary to prevent bot crashing on old callbacks or update issues
      this.bot.catch((err: any, ctx: any) => {
        this.logger.error(`Telegram update error [${ctx?.updateType}]: ${err?.message || err}`);
      });

      this.registerHandlers(this.bot);

      const startPolling = () => {
        if (!this.bot) return;
        this.bot
          .launch()
          .then(() => {
            this.logger.log('Telegram bot started (long polling)');
          })
          .catch((err) => {
            this.logger.error(`Telegram bot polling error: ${(err as Error).message}. Retrying in 5s...`);
            setTimeout(startPolling, 5000);
          });
      };

      startPolling();
    } catch (err) {
      this.logger.error(`Telegram bot initialization failed: ${(err as Error).message}`);
    }
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  private session(chatId: string): Session | undefined {
    return this.sessions.get(chatId);
  }

  private async ensureSession(chatId: string, slug?: string): Promise<Session | null> {
    let session = this.sessions.get(chatId);
    if (!session) {
      let workspace = slug ? await this.prisma.organization.findUnique({ where: { slug } }) : null;
      if (!workspace) {
        workspace = await this.prisma.organization.findFirst();
      }
      if (!workspace) return null;

      const currency = JSON.parse(workspace.metadata || '{}').currency || 'ETB';
      const existingCustomer = await this.customersService.findByTelegramChatId(chatId);

      session = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        currency,
        customerId: existingCustomer?.id ?? null,
        stage: 'idle',
        cart: {},
        language: 'en',
      };
      this.sessions.set(chatId, session);
    }
    return session;
  }

  // Safe reply helper that falls back gracefully if Markdown parsing fails
  private async safeReply(ctx: any, text: string, extra: any = {}) {
    try {
      return await ctx.reply(text, extra);
    } catch (err: any) {
      this.logger.warn(`Markdown formatting rejected: ${err.message}, falling back to plain text`);
      const { parse_mode, ...safeExtra } = extra;
      const plainText = text.replace(/[*_`\[\]()]/g, '');
      return await ctx.reply(plainText, safeExtra).catch((e: any) => {
        this.logger.error(`Failed to send telegram message: ${e.message}`);
      });
    }
  }

  private registerHandlers(bot: Telegraf) {
    // 1. /start command
    bot.start(async (ctx) => {
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const slug = (ctx.startPayload || '').trim();

      const session = await this.ensureSession(chatId, slug);
      if (!session) {
        await ctx.reply('Sorry, no active organization found in the system.');
        return;
      }

      session.stage = 'awaiting_language';

      await ctx.reply(
        'Please choose your language / እባክዎ ቋንቋዎን ይምረጡ / Maaloo afaan keessan filadhaa:',
        Markup.inlineKeyboard([
          [Markup.button.callback('🇬🇧 English', 'lang:en')],
          [Markup.button.callback('🇪🇹 አማርኛ', 'lang:am')],
          [Markup.button.callback('🇪🇹 Afaan Oromoo', 'lang:om')],
        ])
      );
    });

    // 2. Language selection callback
    bot.action(/^lang:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (!chatId) return;

      const session = await this.ensureSession(chatId);
      if (!session) return;

      const lang = ctx.match[1] as Language;
      session.language = lang;

      await this.sendMainMenu(ctx, chatId);
    });

    // 3. Main commands
    bot.command('addshop', async (ctx) => this.startSurvey(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('survey', async (ctx) => this.startSurvey(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('tag', async (ctx) => this.startSurvey(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('registersales', async (ctx) => this.startAgentRegistration(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('myshops', async (ctx) => this.sendMyShops(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('cancel', async (ctx) => this.cancelSurvey(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('menu', async (ctx) => this.sendMenu(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('cart', async (ctx) => this.sendCartSummary(ctx, String(ctx.chat?.id || ctx.from?.id || '')));
    bot.command('help', async (ctx) => {
      const helpText =
        `📍 *Sales Person / Field Survey:*\n` +
        `• /addshop or /tag - Register a new shop location with GPS\n` +
        `• /registersales - Register yourself as a Sales Person in Simuni\n` +
        `• /myshops - View recently registered shops\n` +
        `• /cancel - Cancel current flow\n\n` +
        `🛒 *Customer Ordering:*\n` +
        `• /menu - Browse product catalog\n` +
        `• /cart - View cart and checkout\n` +
        `• /start - Main menu`;
      await this.safeReply(ctx, helpText, { parse_mode: 'Markdown' });
    });

    // 4. Action buttons from Main Menu
    bot.action('start_survey', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      await this.startSurvey(ctx, chatId);
    });

    bot.action('register_sales_agent', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      await this.startAgentRegistration(ctx, chatId);
    });

    bot.action('customer_menu', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = await this.ensureSession(chatId);
      if (!session) return;

      if (!session.customerId) {
        session.stage = 'awaiting_name';
        await this.safeReply(ctx, this.t(session).welcome(session.workspaceName));
      } else {
        await this.sendMenu(ctx, chatId);
      }
    });

    bot.action('my_shops', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      await this.sendMyShops(ctx, chatId);
    });

    // 5. Category Selection Callback during Shop Survey
    bot.action(/^survey_cat:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = this.session(chatId);
      if (!session) return;

      const catKey = ctx.match[1];
      session.surveyShopCategory = catKey;
      session.stage = 'survey_shop_phone';

      const t = this.t(session);
      await this.safeReply(ctx, t.surveyPhonePrompt, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(t.skipPhoneBtn || '⏩ Skip (No Phone)', 'survey_skip_phone')]]),
      });
    });

    // 5b. Skip Phone Button Callback
    bot.action('survey_skip_phone', async (ctx) => {
      await ctx.answerCbQuery('⏩ Skipped').catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = this.session(chatId);
      if (!session) return;

      session.surveyShopPhone = 'N/A';
      session.stage = 'survey_shop_location';

      const t = this.t(session);
      await this.safeReply(ctx, t.surveyLocationPrompt(session.surveyShopName || 'Shop'), {
        parse_mode: 'Markdown',
        ...Markup.keyboard([[Markup.button.locationRequest(t.shareShopLocationBtn)], [Markup.button.text('❌ Cancel')]])
          .oneTime()
          .resize(),
      });
    });

    // 6. Quick Register Callback (when GPS location was shared in idle)
    bot.action('quick_register', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = this.session(chatId);
      if (!session || !session.quickRegisterCoords) return;

      session.stage = 'survey_shop_name_quick';
      await this.safeReply(ctx, '🏪 *Enter Shop / Business Name for this location:*', { parse_mode: 'Markdown' });
    });

    bot.action('dismiss', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.deleteMessage().catch(() => {});
    });

    // 7. Text Messages Router
    bot.on('text', async (ctx) => {
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = await this.ensureSession(chatId);
      if (!session) {
        await ctx.reply(i18n.en.emptyPayload);
        return;
      }

      const text = ctx.message.text.trim();

      // Cancel shortcut
      if (text === '/cancel' || text.toLowerCase() === 'cancel') {
        await this.cancelSurvey(ctx, chatId);
        return;
      }

      const t = this.t(session);

      // --- SALES AGENT REGISTRATION: Name ---
      if (session.stage === 'agent_reg_name') {
        session.agentPendingName = text;
        session.stage = 'agent_reg_phone';
        await this.safeReply(
          ctx,
          t.agentPhonePrompt,
          Markup.keyboard([[Markup.button.contactRequest(t.sharePhoneBtn)], [Markup.button.text('❌ Cancel')]])
            .oneTime()
            .resize()
        );
        return;
      }

      // --- SALES AGENT REGISTRATION: Phone ---
      if (session.stage === 'agent_reg_phone') {
        await this.completeAgentRegistration(ctx, chatId, session, text);
        return;
      }

      // --- SURVEY FLOW: Step 1 (Shop Name) ---
      if (session.stage === 'survey_shop_name') {
        session.surveyShopName = text;
        session.stage = 'survey_shop_category';

        const catButtons = Object.entries(CATEGORIES).map(([key, item]) => {
          const label = session.language === 'am' ? item.labelAm : session.language === 'om' ? item.labelOm : item.labelEn;
          return [Markup.button.callback(label, `survey_cat:${key}`)];
        });

        await this.safeReply(ctx, t.surveyCategoryPrompt(text), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(catButtons),
        });
        return;
      }

      // --- SURVEY FLOW: Step 2 (Phone Number) ---
      if (session.stage === 'survey_shop_phone') {
        const isSkip = ['skip', '/skip', 'ይለፉ', 'እለፍ', 'darbi', '-'].includes(text.toLowerCase());
        session.surveyShopPhone = isSkip ? 'N/A' : text;
        session.stage = 'survey_shop_location';

        await this.safeReply(ctx, t.surveyLocationPrompt(session.surveyShopName || 'Shop'), {
          parse_mode: 'Markdown',
          ...Markup.keyboard([[Markup.button.locationRequest(t.shareShopLocationBtn)], [Markup.button.text('❌ Cancel')]])
            .oneTime()
            .resize(),
        });
        return;
      }

      // --- SURVEY FLOW: Quick Register Name ---
      if (session.stage === 'survey_shop_name_quick' && session.quickRegisterCoords) {
        const { lat, lng } = session.quickRegisterCoords;
        const shop = await this.customersService.registerShopFromTelegram({
          workspaceId: session.workspaceId,
          name: text,
          phone: 'N/A',
          category: 'RETAIL_SHOP',
          lat,
          lng,
          registeredByChatId: chatId,
        });

        session.stage = 'idle';
        session.quickRegisterCoords = undefined;

        await this.safeReply(
          ctx,
          `🎉 *Shop Registered Successfully!*\n\n` +
            `🏪 *Name*: ${shop.name}\n` +
            `🏷️ *Category*: 🏪 Retail Shop\n` +
            `📍 *GPS*: \`${lat.toFixed(6)}, ${lng.toFixed(6)}\`\n` +
            `🗺️ [View on Google Maps](https://maps.google.com/?q=${lat},${lng})\n\n` +
            `✅ Saved to *${session.workspaceName}* database!\n` +
            `Ready for route dispatch and orders.\n\n` +
            `👉 Send /addshop to tag another shop.`,
          { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
        );
        return;
      }

      // --- CUSTOMER REGISTRATION: Step 1 (Customer Name) ---
      if (session.stage === 'awaiting_name') {
        session.pendingName = text;
        session.stage = 'awaiting_phone';
        await ctx.reply(t.askPhone, Markup.keyboard([Markup.button.contactRequest(t.sharePhoneBtn)]).oneTime().resize());
        return;
      }

      // --- CUSTOMER REGISTRATION: Step 2 (Phone) ---
      if (session.stage === 'awaiting_phone') {
        session.pendingPhone = text;
        session.stage = 'awaiting_location';
        await ctx.reply(t.askLocation, Markup.keyboard([Markup.button.locationRequest(t.shareLocationBtn)]).oneTime().resize());
        return;
      }

      // --- CUSTOMER REGISTRATION: Step 3 (Skip Location) ---
      if (session.stage === 'awaiting_location') {
        await this.completeRegistration(ctx, chatId, session, session.pendingPhone!);
        return;
      }

      // --- RANDOM ASSORTMENT ---
      if (session.stage === 'awaiting_random_amount') {
        const amount = parseInt(text.replace(/\D/g, ''), 10);
        if (isNaN(amount) || amount <= 0) {
          await ctx.reply(t.amountInvalid);
          return;
        }

        session.stage = 'idle';
        await ctx.reply(`🎲 Generating ${amount} ETB Assortment...`);

        const products = await this.prisma.product.findMany({
          where: { workspaceId: session.workspaceId, isActive: true },
        });

        if (products.length === 0) {
          await ctx.reply(t.emptyStore);
          return;
        }

        session.cart = {};
        let remaining = amount;
        let addedAny = false;

        const shuffled = [...products].sort(() => 0.5 - Math.random());

        for (const p of shuffled) {
          const price = Number(p.price);
          if (price > 0 && price <= remaining) {
            const maxPossible = Math.floor(remaining / price);
            const qty = Math.min(maxPossible, Math.floor(Math.random() * 3) + 1);
            if (qty > 0) {
              session.cart[p.id] = qty;
              remaining -= price * qty;
              addedAny = true;
            }
          }
        }

        const sortedByPrice = [...products].sort((a, b) => Number(a.price) - Number(b.price));
        while (remaining >= Number(sortedByPrice[0].price)) {
          for (const p of sortedByPrice) {
            const price = Number(p.price);
            if (price <= remaining) {
              session.cart[p.id] = (session.cart[p.id] || 0) + 1;
              remaining -= price;
              addedAny = true;
              break;
            }
          }
        }

        if (!addedAny) {
          await ctx.reply('Sorry, we could not generate an assortment (products might be too expensive).');
        } else {
          await this.sendCartSummary(ctx, chatId);
        }
        return;
      }

      // --- ORDER ITEM QUANTITY ---
      if (session.awaitingQuantityFor) {
        const qty = parseInt(text, 10);
        if (isNaN(qty) || qty <= 0) {
          await ctx.reply(t.invalidNumber);
          return;
        }

        const productId = session.awaitingQuantityFor;
        session.cart[productId] = (session.cart[productId] || 0) + qty;
        session.awaitingQuantityFor = undefined;

        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        await ctx.reply(t.addedToCart(qty, product?.name ?? 'item', product?.unit ?? 'pcs'));
        await this.sendMenu(ctx, chatId);
        return;
      }

      await this.sendMainMenu(ctx, chatId);
    });

    // 8. Contact shared
    bot.on('contact', async (ctx) => {
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = this.session(chatId);
      if (!session) return;

      const phone = ctx.message.contact.phone_number;

      // Contact shared for Sales Agent registration
      if (session.stage === 'agent_reg_phone') {
        await this.completeAgentRegistration(ctx, chatId, session, phone);
        return;
      }

      // Contact shared for customer self-registration
      if (session.stage === 'awaiting_phone') {
        session.pendingPhone = phone;
        session.stage = 'awaiting_location';
        const t = this.t(session);
        await ctx.reply(t.askLocation, Markup.keyboard([Markup.button.locationRequest(t.shareLocationBtn)]).oneTime().resize());
      }
    });

    // 9. Location shared (Both Field Survey & Customer Self-Registration)
    bot.on('location', async (ctx) => {
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      const session = await this.ensureSession(chatId);
      if (!session) return;

      const { latitude, longitude } = ctx.message.location;

      // --- FIELD SURVEY LOCATION CAPTURED ---
      if (session.stage === 'survey_shop_location') {
        const catKey = session.surveyShopCategory || 'RETAIL_SHOP';
        const catMeta = CATEGORIES[catKey] || CATEGORIES.RETAIL_SHOP;
        const categoryLabel =
          session.language === 'am' ? catMeta.labelAm : session.language === 'om' ? catMeta.labelOm : catMeta.labelEn;

        const shop = await this.customersService.registerShopFromTelegram({
          workspaceId: session.workspaceId,
          name: session.surveyShopName || 'Field Survey Shop',
          phone: session.surveyShopPhone || 'N/A',
          category: catKey,
          lat: latitude,
          lng: longitude,
          registeredByChatId: chatId,
        });

        session.stage = 'idle';
        session.surveyShopName = undefined;
        session.surveyShopCategory = undefined;
        session.surveyShopPhone = undefined;

        await this.safeReply(
          ctx,
          `🎉 *Shop Registered Successfully!*\n\n` +
            `🏪 *Name*: ${shop.name}\n` +
            `🏷️ *Category*: ${categoryLabel}\n` +
            `📞 *Phone*: ${shop.phone}\n` +
            `📍 *GPS*: \`${latitude.toFixed(6)}, ${longitude.toFixed(6)}\`\n` +
            `🗺️ [View on Google Maps](https://maps.google.com/?q=${latitude},${longitude})\n\n` +
            `✅ Saved to *${session.workspaceName}* database!\n` +
            `This shop is now available for route delivery and orders.\n\n` +
            `👉 Send /addshop to tag another location.`,
          {
            parse_mode: 'Markdown',
            ...Markup.removeKeyboard(),
          }
        );
        return;
      }

      // --- CUSTOMER SELF-REGISTRATION LOCATION ---
      if (session.stage === 'awaiting_location') {
        await this.completeRegistration(ctx, chatId, session, session.pendingPhone!, latitude, longitude);
        return;
      }

      // --- IDLE: Passive Location Pin Shared by Sales Person ---
      session.quickRegisterCoords = { lat: latitude, lng: longitude };
      await this.safeReply(
        ctx,
        `📍 *Location Received:*\n\`${latitude.toFixed(6)}, ${longitude.toFixed(6)}\`\n\n` +
          `Would you like to register a shop at this spot?`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏪 Register Shop Here', 'quick_register')],
            [Markup.button.callback('❌ Dismiss', 'dismiss')],
          ]),
        }
      );
    });

    // 10. Catalog & Cart Handlers
    bot.action(/^add:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (!session) return;

      const t = this.t(session);
      const productId = ctx.match[1];
      const product = await this.prisma.product.findUnique({ where: { id: productId } });

      session.awaitingQuantityFor = productId;
      await this.safeReply(ctx, t.howMany(product?.name ?? 'item', product?.unit ?? 'pcs'));
    });

    bot.action('random_assortment', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (!session) return;

      const t = this.t(session);
      session.stage = 'awaiting_random_amount';
      await this.safeReply(ctx, t.askAmount);
    });

    bot.action('checkout', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (chatId) await this.sendCartSummary(ctx, chatId);
    });

    bot.action('confirm_order', async (ctx) => {
      await ctx.answerCbQuery('✅').catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (!session) return;
      const t = this.t(session);

      if (Object.keys(session.cart).length === 0) {
        await ctx.reply(t.cartEmpty);
        return;
      }
      if (!session.customerId) {
        await ctx.reply(t.sessionExpired);
        return;
      }

      const items = Object.entries(session.cart).map(([productId, quantity]) => ({ productId, quantity }));
      const order = await this.ordersService.createFromTelegram(session.workspaceId, session.customerId, items);
      const total = this.ordersService.orderTotal(order as any);

      session.cart = {};
      await ctx.editMessageText(t.orderPlaced(session.workspaceName, session.currency, total.toFixed(2))).catch(() => {});
    });

    bot.action('cancel_order', async (ctx) => {
      await ctx.answerCbQuery('❌').catch(() => {});
      const chatId = String(ctx.chat?.id || ctx.from?.id || '');
      if (!chatId) return;
      const session = this.session(chatId);
      if (session) {
        session.cart = {};
        await ctx.editMessageText(this.t(session).orderCancelled).catch(() => {});
      }
    });

    bot.action('change_lang', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply(
        'Please choose your language / እባክዎ ቋንቋዎን ይምረጡ / Maaloo afaan keessan filadhaa:',
        Markup.inlineKeyboard([
          [Markup.button.callback('🇬🇧 English', 'lang:en')],
          [Markup.button.callback('🇪🇹 አማርኛ', 'lang:am')],
          [Markup.button.callback('🇪🇹 Afaan Oromoo', 'lang:om')],
        ])
      );
    });
  }

  // Helper: Start Survey Wizard
  private async startSurvey(ctx: any, chatId: string) {
    const session = await this.ensureSession(chatId);
    if (!session) return this.safeReply(ctx, 'No active organization found.');

    session.stage = 'survey_shop_name';
    session.surveyShopName = undefined;
    session.surveyShopCategory = undefined;
    session.surveyShopPhone = undefined;

    const t = this.t(session);
    await this.safeReply(ctx, t.surveyStartPrompt, { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
  }

  // Helper: Start Agent / Sales Person Self-Registration
  private async startAgentRegistration(ctx: any, chatId: string) {
    const session = await this.ensureSession(chatId);
    if (!session) return this.safeReply(ctx, 'No active organization found.');

    session.stage = 'agent_reg_name';
    session.agentPendingName = undefined;

    const t = this.t(session);
    await this.safeReply(ctx, t.agentRegPrompt, { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
  }

  // Helper: Complete Agent Registration
  private async completeAgentRegistration(ctx: any, chatId: string, session: Session, phone: string) {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const agentName = session.agentPendingName || 'Field Sales Person';

    // Create or update User as 'agent'
    const email = `agent_${chatId}@simuni.local`;
    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        name: agentName,
        username: cleanPhone || chatId,
        phoneNumber: cleanPhone || null,
        role: 'agent',
      },
      create: {
        name: agentName,
        email,
        username: cleanPhone || chatId,
        phoneNumber: cleanPhone || null,
        role: 'agent',
      },
    });

    // Ensure member of workspace
    const existingMember = await this.prisma.member.findFirst({
      where: { userId: user.id, organizationId: session.workspaceId },
    });

    if (!existingMember) {
      await this.prisma.member.create({
        data: {
          userId: user.id,
          organizationId: session.workspaceId,
          role: 'agent',
        },
      });
    }

    session.stage = 'idle';

    await this.safeReply(
      ctx,
      `🎉 *Sales Person Account Registered & Linked!*\n\n` +
        `👤 *Name*: ${agentName}\n` +
        `📱 *Phone / Username*: \`${cleanPhone || chatId}\`\n` +
        `🏢 *Workspace*: ${session.workspaceName}\n` +
        `💼 *Role*: Field Sales Agent\n\n` +
        `You can now tag customer shops on the road using **/addshop** or tap the button below.`,
      {
        parse_mode: 'Markdown',
        ...Markup.removeKeyboard(),
      }
    );

    await this.sendMainMenu(ctx, chatId);
  }

  // Helper: Cancel Survey Wizard
  private async cancelSurvey(ctx: any, chatId: string) {
    const session = this.session(chatId);
    if (session) {
      session.stage = 'idle';
      session.surveyShopName = undefined;
      session.surveyShopCategory = undefined;
      session.surveyShopPhone = undefined;
      session.quickRegisterCoords = undefined;
      session.agentPendingName = undefined;
    }
    const t = session ? this.t(session) : i18n.en;
    await ctx.reply(t.surveyCancelled, Markup.removeKeyboard());
  }

  // Helper: Show Main Menu
  private async sendMainMenu(ctx: any, chatId: string) {
    const session = await this.ensureSession(chatId);
    if (!session) return;

    const message =
      `👋 *Simuni Field Assistant & Ordering*\n` +
      `🏢 Business: *${session.workspaceName}*\n\n` +
      `Select an option below:`;

    const buttons = [
      [Markup.button.callback('📍 Register / Tag Shop (Field Survey)', 'start_survey')],
      [Markup.button.callback('👤 Register as Sales Person', 'register_sales_agent')],
      [Markup.button.callback('🛒 Browse Catalog & Place Order', 'customer_menu')],
      [Markup.button.callback('📋 My Registered Shops Today', 'my_shops')],
      [Markup.button.callback('🌐 Change Language', 'change_lang')],
    ];

    await this.safeReply(ctx, message, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  }

  // Helper: Show Recently Registered Shops
  private async sendMyShops(ctx: any, chatId: string) {
    const session = await this.ensureSession(chatId);
    if (!session) return ctx.reply('No active organization found.');

    const shops = await this.prisma.customer.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (shops.length === 0) {
      await ctx.reply('No shops registered yet. Send /addshop to tag your first shop location!');
      return;
    }

    const lines = shops.map((s, idx) => {
      const coords = s.lat && s.lng ? `\`${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}\`` : 'No GPS';
      const cat = CATEGORIES[s.category || 'RETAIL_SHOP']?.labelEn || s.category;
      return `${idx + 1}. *${s.name}* (${cat})\n   📍 ${coords} · 📞 ${s.phone}`;
    });

    await this.safeReply(
      ctx,
      `📋 *Recent Registered Shops:*\n\n${lines.join('\n\n')}\n\n👉 Send /addshop to register another location.`,
      { parse_mode: 'Markdown' }
    );
  }

  private async completeRegistration(ctx: any, chatId: string, session: Session, phone: string, lat?: number, lng?: number) {
    const customer = await this.customersService.registerFromTelegram(
      session.workspaceId,
      chatId,
      session.pendingName || 'Telegram Customer',
      phone,
      lat,
      lng
    );
    session.customerId = customer.id;
    session.stage = 'idle';
    await ctx.reply(this.t(session).allSet(customer.name), Markup.removeKeyboard());
    await this.sendMenu(ctx, chatId);
  }

  private async sendMenu(ctx: any, chatId: string) {
    const session = this.session(chatId);
    if (!session) return ctx.reply(i18n.en.emptyPayload);
    const t = this.t(session);

    const products = await this.productsService.findAll(session.workspaceId);
    const activeProducts = products.filter((p) => p.isActive !== false);

    if (activeProducts.length === 0) {
      await ctx.reply(t.emptyStore);
      return;
    }

    const buttons = activeProducts.map((p) => [
      Markup.button.callback(`${p.name} - ${session.currency} ${Number(p.price).toFixed(2)} / ${p.unit}`, `add:${p.id}`),
    ]);
    buttons.push([Markup.button.callback((t as any).randomAssortment, 'random_assortment')]);
    buttons.push([Markup.button.callback(t.viewCart, 'checkout')]);
    buttons.push([Markup.button.callback(t.changeLanguage, 'change_lang')]);

    await ctx.reply(t.selectProduct(session.workspaceName), Markup.inlineKeyboard(buttons));
  }

  private async sendCartSummary(ctx: any, chatId: string) {
    const session = this.session(chatId);
    if (!session || Object.keys(session.cart).length === 0) {
      await ctx.reply(session ? this.t(session).cartEmpty : i18n.en.cartEmpty);
      return;
    }
    const t = this.t(session);

    const lines: string[] = [];
    let total = 0;
    for (const [productId, qty] of Object.entries(session.cart)) {
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      const lineTotal = Number(product.price) * qty;
      total += lineTotal;
      lines.push(`${product.name} x ${qty} - ${session.currency} ${lineTotal.toFixed(2)}`);
    }

    await ctx.reply(
      `${t.yourOrder}\n\n${lines.join('\n')}\n\n${t.total}: ${session.currency} ${total.toFixed(2)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback(t.confirmOrderBtn, 'confirm_order')],
        [Markup.button.callback(t.cancelBtn, 'cancel_order')],
      ])
    );
  }
}
