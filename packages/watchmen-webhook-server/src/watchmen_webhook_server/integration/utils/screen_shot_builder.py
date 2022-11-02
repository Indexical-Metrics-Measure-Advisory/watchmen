

from pyppeteer import launch

from watchmen_model.webhook.event_defination import EventSource



def get_source_url(event_source: EventSource):
    return 'http://localhost:3000/login'


async def screenshot_to_pdf(source_id:str,source_type:EventSource):
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

