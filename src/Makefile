all:
	rm -rf one.ts dist
	deno fmt *.ts
#	cat r2wasm.ts ansi2html.ts > one.ts
	deno run --allow-all bundler.ts r2wasm.ts r2wasm
	deno run --allow-all bundler.ts rasm2wasm.ts rasm2wasm
	cp dist/*.js ..
	make -C ..

edit:
	open -a "Visual Studio Code" r2wasm.ts

clean:
	rm -rf dist
