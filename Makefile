all:
	sleep 1 && open http://localhost:8080 &
	python -m http.server 8080
