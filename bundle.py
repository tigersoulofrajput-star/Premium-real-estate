import re,sys
root='/home/claude/premium-realty/'
html=open(root+'index.html').read()
css=open(root+'assets/css/styles.css').read()
order=['config','util','store','gl','viewers','seed','public','admin','app']
js=''
for n in order:
    s=open(root+f'assets/js/{n}.js').read()
    if n=='config': s=s.replace('embedMaps:true','embedMaps:false').replace('embedMaps: true','embedMaps: false')
    js+=s+'\n'
js=js.replace('</script','<\\/script')
body=re.search(r'<body[^>]*>(.*)</body>',html,re.S).group(1)
body=re.sub(r'<script[^>]*src=[^>]*></script>','',body)
fonts=re.search(r'<link[^>]*fonts[^>]*>',html)
out='<title>Aurelia Estates</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
out+=''.join(re.findall(r'<link[^>]*(?:googleapis|gstatic)[^>]*>',html))+'\n'
out+='<style>'+css+'</style>\n'+body+'\n<script>'+js+'</script>\n'
open(sys.argv[1],'w').write(out)
print(len(out))
