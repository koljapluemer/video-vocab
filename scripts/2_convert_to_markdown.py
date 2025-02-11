from bs4 import BeautifulSoup
import os
import re

HTML_FOLDER = "/home/b/GITHUB/vary-video-vocab/scripts/data/vocab/jNQXAC9IVRw"
OUT_FOLDER = "/home/b/GITHUB/vary-video-vocab/scripts/data/md/jNQXAC9IVRw"


def convert_html_pages_to_markdown(html_folder, out_folder):
    """
    Converts all HTML files in a folder to Markdown, preserving the order of <h1> and <table> elements.
    
    Args:
        html_folder (str): Path to the folder containing HTML files.
        out_folder (str): Path to the folder where Markdown files will be saved.
    """
    # Ensure the output folder exists
    os.makedirs(out_folder, exist_ok=True)
    
    # Process each HTML file in the input folder
    for filename in os.listdir(html_folder):
        if filename.endswith(".html"):
            input_path = os.path.join(html_folder, filename)
            output_path = os.path.join(out_folder, os.path.splitext(filename)[0] + ".md")
            
            # Read and convert the HTML file
            with open(input_path, "r", encoding="utf-8") as html_file:
                html_content = html_file.read()
                markdown_content = html_to_markdown(html_content)
            
            # Write the Markdown content to the output folder
            with open(output_path, "w", encoding="utf-8") as markdown_file:
                markdown_file.write(markdown_content)
            
            print(f"Converted '{filename}' to Markdown and saved to '{output_path}'.")


def html_to_markdown(html_content):
    """
    Convert the HTML to Markdown with <h1> and <table> elements in order.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    markdown = []
    
    # Iterate through all <h1> and <table> elements, preserving order
    last_heading = ""
    for element in soup.find_all(['h1', 'table']):
        if element.name == 'h1':
            last_heading = element.text.strip()
            # markdown.append(f"# {last_heading}")
        elif element.name == 'table':
            # Convert <table> to Markdown
            markdown.append(convert_table_to_markdown(element, last_heading))
    
    # Combine the markdown elements into a single string
    return "\n\n".join(markdown)

def convert_table_to_markdown(table, heading:str):
    """
    Convert an HTML <table> into Markdown table format.
    """
    rows = table.find_all('tr')
    markdown_rows = []

    if len(rows) > 0:
        cell_containing_meaning_found = False
        markdown_rows.append(f"| {heading} |")
        nr_of_cells = len(rows[0].find_all(['th', 'td']))
        markdown_rows.append("| " + " --- | " * nr_of_cells)
    
        for i, row in enumerate(rows):
            cells = row.find_all(['th', 'td'])
            for cell in cells:
                remove_invisible_spans(cell) 
                convert_bold_to_markdown(cell)
                convert_links_to_markdown(cell)

                cell.render_text = cell.get_text()

                if not cell_containing_meaning_found and heading == "Meanings":
                    if len(cell.render_text) > 2:
                        cell.render_text = '==' + cell.render_text + '==' 
                        cell_containing_meaning_found = True


            row_content = '| ' + ' | '.join(
                        cell.render_text for cell in cells
                    ) + ' |'

            markdown_rows.append(row_content)
            
            # Add a separator after the header row
            if i == 0 and row.find_all('th'):
                separator = '| ' + ' | '.join('---' for _ in cells) + ' |'
                markdown_rows.append(separator)
    
    return "\n".join(markdown_rows)


def remove_invisible_spans(cell):
    """
    Removes all <span> elements with style="display: none;" from the given cell.
    
    Args:
        cell (Tag): A <th> or <td> element.
    """
    for span in cell.find_all('span', style="display: none;"):
        span.decompose()


def convert_bold_to_markdown(cell):
    """
    Converts <b> tags to Markdown **bold** syntax inside a cell.
    
    Args:
        cell (Tag): The <th> or <td> element.

    Returns:
        str: The cell's text with <b> tags converted to Markdown.
    """
    # Replace <b> with Markdown syntax for bold (**)
    for bold_tag in cell.find_all('b'):
        bold_tag.insert_before("**")
        bold_tag.insert_after("**")
        bold_tag.unwrap()  # Remove the <b> tag, leaving the text with Markdown syntax
    return cell


def convert_links_to_markdown(cell):
    """
    Converts <a> tags to Markdown [text](url) syntax inside a cell.
    
    Args:
        cell (Tag): The <th> or <td> element.

    Returns:
        str: The cell's text with <a> tags converted to Markdown links.
    """
    for a_tag in cell.find_all('a', href=True):
        # Extract the text and URL
        link_text = a_tag.get_text() or "🔗"
        link_url = a_tag['href']
        
        # Replace the <a> tag with Markdown syntax
        markdown_link = f"[{link_text}](https://eu.lisaanmasry.org/online/{link_url})"
        
        # Replace the <a> tag with the markdown link
        a_tag.insert_before(markdown_link)
        a_tag.decompose()  # Remove the <a> tag, leaving the Markdown link syntax
    return cell


# Main entry point
if __name__ == "__main__":
    convert_html_pages_to_markdown(HTML_FOLDER, OUT_FOLDER)