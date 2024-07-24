"""Builds a Markdown Document"""

from io import StringIO


def bullet(text):
    """ turns raw text into a markdown bullet"""
    return '- ' + text


def make_link(text: str, link: str) -> str:

    """
    Creates a markdown link

    :param text: the text to display
    :param link: the link target
    :return: the formatted link
    """
    return '[%s](%s)' % (text, link)

# TODO: Add code to support inline bold, italic etc.


class MarkdownDocument:
    def __init__(self, indentation=None):

        #: A container for the text of the markdown document
        self._contents = StringIO()

        #: a string prefix used to indent text
        self.indentation = indentation if indentation else '    '

    def append_text(self, text: str) -> 'MarkdownDocument':
        """

        :param text:
        :return:
        """
        self._contents.write(text)
        self._contents.write('\n')
        return self

    def append_text_indented(self, text: str, depth: int):
        text = (depth*self.indentation)+text
        self.append_text(text)

    def append_link(self, text: str, link, depth: int = 0):
        self.append_text_indented(make_link(text, link), depth)

    def append_bulleted_link(self, text: str, link: str, depth: int = 0):
        self.append_text_indented(bullet(make_link(text, link)), depth)

    def append_bullet(self, text: str, depth=0):
        self.append_text_indented(bullet(text), depth)

    def close(self):
        self._contents.close()

    def contents(self):
        result = self._contents.getvalue()
        return result

    def append_heading(self, text, level=1):
        self.append_text(level*'#' +' ' + text)

    def append_image_link(self, node_text, location, decoration):
        self.append_text('\n\n![%s](%s)%s\n\n' % (node_text, location, decoration))

    def new_page(self):
        self.append_text('\n\n\\newpage\n\n')