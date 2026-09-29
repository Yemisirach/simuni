import codecs

text = codecs.open('src/telegram/telegram.service.ts', 'r', 'utf8').read()
text = text.replace("ta'e", "ta\\'e")
text = text.replace("deebi'uun", "deebi\\'uun")
text = text.replace("deebi'aa", "deebi\\'aa")
codecs.open('src/telegram/telegram.service.ts', 'w', 'utf8').write(text)
