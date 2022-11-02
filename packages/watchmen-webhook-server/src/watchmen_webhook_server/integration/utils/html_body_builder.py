""" Generate responsive HTML emails from Markdown files used in a pelican blog.

Refer to https://pbpython.com/ for the details.

"""
import os

from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader
from premailer import transform

from watchmen_model.webhook.event_defination import EventSource


def create_HTML(template, source_id, source_type):
	dir_path = os.path.dirname(os.path.realpath(__file__))
	# print(dir_path)
	# Set up jinja te   mplates
	env = Environment(loader=FileSystemLoader(dir_path))
	template = env.get_template(template)

	# Define the template variables and render
	template_vars = {'email_content': "markdown_content", 'title': "My Subscriptions"}
	raw_html = template.render(template_vars)

	# Generate the final output string
	# Inline all the CSS using premailer.transform
	# Use BeautifulSoup to make the formatting nicer
	soup = BeautifulSoup(transform(raw_html), 'html.parser').prettify(formatter="html")
	final_html = str(soup)
	return final_html


def build_body(source_id: str, event_source: EventSource):
	return create_HTML("template.html", source_id, event_source)
