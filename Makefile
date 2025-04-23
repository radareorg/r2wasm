all:
	sleep 1 && open http://localhost:8080 &
	python -m http.server 8080

runno.js:
	wget 'https://unpkg.com/@antonz/runno@0.6.1/dist/runno.js'
