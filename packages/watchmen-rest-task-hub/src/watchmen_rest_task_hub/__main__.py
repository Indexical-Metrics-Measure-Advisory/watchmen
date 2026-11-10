import uvicorn


if __name__ == '__main__':
	uvicorn.run('watchmen_rest_task_hub.main:app', host='0.0.0.0', port=8820)
