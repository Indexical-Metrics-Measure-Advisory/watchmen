from uvicorn import run

if __name__ == "__main__":
	run("watchmen_rest_dqc.main:app", host="127.0.0.1", port=8800, log_level="info", workers=1,loop="uvloop")
