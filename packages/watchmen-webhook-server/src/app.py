from uvicorn import run

if __name__ == "__main__":
	run("watchmen_webhook_server.main:app", host="127.0.0.1", port=8900, log_level="info", workers=1)
