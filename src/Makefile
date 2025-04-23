all:
	rm -rf one.ts dist
	deno fmt *.ts
#	cat r2wasm.ts ansi2html.ts > one.ts
	deno run --allow-all bundler.ts
	cp dist/*.js ..
	make -C ..

edit:
	open -a "Visual Studio Code" r2wasm.ts

clean:
	rm -rf dist
