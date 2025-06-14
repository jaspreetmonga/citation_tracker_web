import networkx as nx

graph = nx.DiGraph()

def insert_paper(info):
    title = info.get('title')
    if not title:
        # Skip if no title provided
        return

    authors = info.get('authors', '')
    journal = info.get('journal', '')
    year = info.get('year', '')
    citations = info.get('citations', '')

    # Add the paper node with year attribute
    graph.add_node(title, type='paper', year=year)

    # Add authors nodes and edges only if authors string is not empty
    if isinstance(authors, str) and authors.strip():
        for author in authors.split(','):
            author = author.strip()
            if author:
                graph.add_node(author, type='author')
                graph.add_edge(title, author, relation='authored_by')

    # Add journal node and edge only if journal is a non-empty string
    if isinstance(journal, str) and journal.strip():
        graph.add_node(journal, type='journal')
        graph.add_edge(title, journal, relation='in_journal')

    # Ensure citations is a string before splitting, handle NaN or other types gracefully
    if not isinstance(citations, str):
        citations = ''

    for cited in citations.split(','):
        cited = cited.strip()
        if cited:
            graph.add_node(cited, type='paper')
            graph.add_edge(title, cited, relation='cites')


def find_by_author(author):
    # Returns papers authored by the author
    return [node for node in graph.predecessors(author) if graph.nodes[node].get('type') == 'paper']


def find_citers(paper):
    # Returns papers that cite the given paper
    return [node for node in graph.predecessors(paper) if graph[node][paper].get('relation') == 'cites']


def export_graph():
    return {
        'nodes': [{'id': node, 'type': data.get('type')} for node, data in graph.nodes(data=True)],
        'edges': [{'source': src, 'target': dst, 'relation': data.get('relation')} for src, dst, data in graph.edges(data=True)]
    }
