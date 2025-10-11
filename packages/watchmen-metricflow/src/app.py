from uvicorn import run

if __name__ == "__main__":
    run("watchmen_metricflow.main:app", host="127.0.0.1", port=8910, log_level="info", workers=1, loop="uvloop")
