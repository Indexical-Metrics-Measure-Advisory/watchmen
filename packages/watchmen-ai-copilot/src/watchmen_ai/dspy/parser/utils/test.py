def json_to_markdown(children):
    markdown = []
    for child in children:
        if child.get("type") == "RawText":
            markdown.append(child.get("content"))
        elif child.get("type") == "Strong":
            markdown.append(f"**{child.get('children')[0].get('content')}**")
        elif child.get("type") == "Paragraph":
            markdown.append(json_to_markdown(child.get("children")))
            markdown.append("\n\n")
        elif child.get("type") == "Heading":
            level = child.get("level")
            content = child.get("children")[0].get("content")
            markdown.append(f"{'#' * level} {content}\n\n")
        elif child.get("type") == "ListItem":
            markdown.append(f"- {json_to_markdown(child.get('children'))}\n")
        elif child.get("type") == "ThematicBreak":
            markdown.append("\n---\n")
        elif "children" in child:
            markdown.append(json_to_markdown(child.get("children")))
    return ''.join(markdown)


# Example usage
data = [
    {
        'type': 'Paragraph',
        'line_number': 3,
        'children': [
            {'type': 'RawText', 'content': 'In the competitive world of insurance, '},
            {'type': 'Strong', 'children': [{'type': 'RawText', 'content': 'sales incentives'}]},
            {'type': 'RawText',
             'content': ' play a crucial role in boosting business growth. To make smart decisions, it’s important to know how these programs affect key numbers like '},
            {'type': 'Strong', 'children': [{'type': 'RawText', 'content': 'AFYP'}]},
            {'type': 'RawText', 'content': ' (Annualized First Year Premium), '},
            {'type': 'Strong', 'children': [{'type': 'RawText', 'content': 'AFYC'}]},
            {'type': 'RawText', 'content': ' (Annualized First Year Commission), and the total '},
            {'type': 'Strong', 'children': [{'type': 'RawText', 'content': 'policy count'}]},
            {'type': 'RawText',
             'content': '. This story walks through how incentive programs impact business performance, offering insights for leadership to improve future strategies.'}
        ]
    },
    {'type': 'ThematicBreak', 'line_number': 5}
]

result = json_to_markdown(data)
print(result)
