import codecs

text = codecs.open('src/telegram/telegram.service.ts', 'r', 'utf8').read()

if 'om:' not in text:
    om_block = """  om: {
    selectLang: 'Maaloo afaan keessan filadhaa:',
    welcome: (workspace: string) => `👋 Baga nagaan gara ${workspace} dhuftan!\\n\\nMaqaan keessan eenyu?`,
    askPhone: 'Galatoomaa! Lakkoofsa bilbilaa keessan? (Barreessuu ykn share gochuu dandeessu.)',
    sharePhoneBtn: '📱 Lakkoofsa koo ergi',
    askLocation: 'Maaloo bakka jirtan nuuf ergaa (Ykn "skip" barreessaa)',
    shareLocationBtn: '📍 Bakka koo ergi',
    welcomeBack: (workspace: string, name: string) => `Baga nagaan deebitan gara ${workspace}, ${name}! 👋`,
    invalidNumber: 'Maaloo lakkoofsa sirrii galchaa (fkn: 10).',
    addedToCart: (qty: number, item: string, unit: string) => `${qty} ${unit} kan ${item} cart keessanitti dabalameera! ✅`,
    useMenu: 'Oomishoota ilaaluuf /menu, ykn ajaja keessan ilaaluuf /cart fayyadhaa.',
    howMany: (item: string, unit: string) => `**${item}** filattaniittu.\\n\\n${unit} meeqaa barbaaddu? (Lakkoofsa barreessaa)`,
    cartEmpty: 'Cart keessan duwwaadh. Oomishoota dabaluuf /menu fayyadhaa.',
    emptyStore: "Dhaabbanni kun ammatti oomisha hin daballe - dhiyootti deebi'aa ilaalaa.",
    viewCart: '🛒 Cart fi Kaffaltii',
    randomAssortment: '🎲 Filannoo Adda Addaa (Random)',
    askAmount: 'Filannoo adda addaaf ETB meeqa baasuu barbaaddu?',
    amountInvalid: 'Maaloo lakkoofsa sirrii 0 ol ta\\'e galchaa.',
    selectProduct: (workspace: string) => `📦 ${workspace} - Oomisha filachuuf tuqaa:`,
    yourOrder: '🛒 Ajaja keessan:',
    total: 'Waliigala',
    confirmOrderBtn: '✅ Ajaja Mirkaneessi',
    cancelBtn: '❌ Haqi',
    orderPlaced: (workspace: string, currency: string, total: string) => `✅ Ajajni keessan ${workspace} tiif ergameera!\\n\\nWaliigala: ${currency} ${total}\\n\\nYeroo dhiyootti nama geessu isiniif ramadama. Irra deebi'uun ajajuuf /menu fayyadhaa.`,
    orderCancelled: 'Ajajni haqameera. Irra deebi\\'uun jalqabuuf /menu fayyadhaa.',
    allSet: (name: string) => `Galatoomaa, ${name}! Xumurreerra. 🎉`,
    changeLanguage: '🌐 Afaan Jijjiiri',
    sessionExpired: 'Yeroon darbeera - /start irra deebi\\'aa ergaa.',
    emptyPayload: 'Maaloo linkii ajaja dhaabbataa tuqaa.'
  }
};"""
    text = text.replace('emptyPayload: \'እባክዎ የድርጅት ማዘዣ ሊንክ ይጫኑ።\'\n  },', 'emptyPayload: \'እባክዎ የድርጅት ማዘዣ ሊንክ ይጫኑ።\'\n  },\n' + om_block)
    
    codecs.open('src/telegram/telegram.service.ts', 'w', 'utf8').write(text)
