from pyppeteer import launch

from watchmen_model.webhook.event_defination import EventSource


# TODO move url to settings
def get_source_url(event_source: EventSource):
	return 'https://h2o.ai/'



async def screenshot_page(source_id: str, source_type: EventSource):
	browser = await launch()
	page = await browser.newPage()
	await page.goto(get_source_url(source_type))
	await page.setViewport({
		"width": 1920,
		"height": 1080
	})
	screen = await page.screenshot(fullPage=True)
	await browser.close()
	return screen
