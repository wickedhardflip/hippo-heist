import sys
src='src/'
head=open(src+'head.html').read()
js=''.join(open(src+f).read()+'\n' for f in ['core.js','audio.js','levels.js','world.js','actors.js','game.js','hud.js'])
three_cdn='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
body=head+'\n'+three_cdn+'\n<script>\n(function(){\n"use strict";\n'+js+'\n})();\n</script>\n'
open('game.html','w').write(body)
test='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+body.replace(three_cdn,'<script src="three.min.js"></script>')+'</body></html>'
open('test.html','w').write(test)

# index.html: the page GitHub Pages serves at https://wickedhardflip.github.io/hippo-heist/
site='https://wickedhardflip.github.io/hippo-heist'
desc='A hippo stealing bananas to feed a hungry leopard while avoiding angry farmers.'
meta=f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta property="og:title" content="Hippo Heist" />
<meta property="og:description" content="{desc}" />
<meta property="og:image" content="{site}/preview.png" />
<meta property="og:url" content="{site}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Hippo Heist" />
<meta name="twitter:description" content="{desc}" />
<meta name="twitter:image" content="{site}/preview.png" />'''
open('index.html','w').write('<!doctype html>\n<html lang="en"><head>\n'+meta+'\n</head><body>\n'+body+'</body></html>\n')
print(len(body))
