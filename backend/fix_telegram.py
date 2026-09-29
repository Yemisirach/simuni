import codecs
import re

with codecs.open('src/telegram/telegram.service.ts', 'r', 'utf8') as f:
    text = f.read()

# Fix Session interface
text = text.replace(
    "stage: 'awaiting_language' | 'awaiting_name' | 'awaiting_phone' | 'awaiting_random_amount' | 'idle';",
    "stage: 'awaiting_language' | 'awaiting_name' | 'awaiting_phone' | 'awaiting_location' | 'awaiting_random_amount' | 'idle';\n    pendingPhone?: string;"
)

# AM block starts at `  am: {`
am_block = """    am: {
      selectLang: 'እባክዎ ቋንቋዎን ይምረጡ፡',
      welcome: (workspace: string) => `👋 እንኳን ወደ ${workspace} በደህና መጡ!\\n\\nእባክዎ ስምዎን ያስገቡ - ስምዎ ማን ነው?`,
      askPhone: 'እናመሰግናለን! ስልክ ቁጥርዎስ? (መፃፍ ወይም አድራሻዎን ማጋራት ይችላሉ)',
      sharePhoneBtn: '📱 ስልክ ቁጥሬን አጋራ',
      askLocation: 'እባክዎ ያሉበትን ቦታ ያጋሩን? (ወይም "skip" ይበሉ)',
      shareLocationBtn: '📍 ቦታዬን አጋራ',
      welcomeBack: (workspace: string, name: string) => `እንኳን በደህና ተመለሱ ወደ ${workspace}, ${name}! 👋`,
      invalidNumber: 'እባክዎ ትክክለኛ ቁጥር ያስገቡ (ለምሳሌ 10)።',
      addedToCart: (qty: number, item: string, unit: string) => `${qty} ${unit} የ ${item} ወደ ዘንቢልዎ ታክሏል! ✅`,
      useMenu: 'ምርቶችን ለማየት /menu ይጠቀሙ፣ ወይም ትዕዛዝዎን ለማየት /cart ይጠቀሙ።',
      howMany: (item: string, unit: string) => `**${item}** መርጠዋል።\\n\\nስንት ${unit} ይፈልጋሉ? (ቁጥሩን ከታች ይፃፉ)`,
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
      orderPlaced: (workspace: string, currency: string, total: string) => `✅ ትዕዛዝዎ ለ ${workspace} ተልኳል!\\n\\nድምር: ${currency} ${total}\\n\\nበቅርቡ አድራሽ ይመደብልዎታል። እንደገና ለማዘዝ /menu ይጠቀሙ።`,
      orderCancelled: 'ትዕዛዝዎ ተሰርዟል። እንደገና ለመጀመር /menu ይጠቀሙ።',
      allSet: (name: string) => `እናመሰግናለን, ${name}! ጨርሰናል። 🎉`,
      changeLanguage: '🌐 ቋንቋ ቀይር',
      sessionExpired: 'ጊዜው አልቋል - እባክዎ /start ብለው እንደገና ይጀምሩ።',
      emptyPayload: 'እባክዎ የድርጅት ማዘዣ ሊንክ ይንኩ።'
    },"""

text = re.sub(r'am: \{.*?\n    \},', am_block, text, flags=re.DOTALL)

om_block = """    om: {
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
    }"""

text = re.sub(r'om: \{.*?\n    \}', om_block, text, flags=re.DOTALL)

with codecs.open('src/telegram/telegram.service.ts', 'w', 'utf8') as f:
    f.write(text)
