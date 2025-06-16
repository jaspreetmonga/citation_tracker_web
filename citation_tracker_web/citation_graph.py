import networkx as nx

# Initialize a directed graph
graph = nx.DiGraph()

def insert_paper(info):
    """
    Inserts a paper and its relationships (authors, journal, citations) into the graph.
    """
    title = info.get('title')
    if not title:
        return  # Skip if no title is provided

    authors = info.get('authors', '')
    journal = info.get('journal', '')
    year = info.get('year', '')
    citations = info.get('citations', '')

    # Add the paper node with its year as an attribute
    graph.add_node(title, type='paper', year=year)

    # Add edges for authors
    if isinstance(authors, str) and authors.strip():
        for author in authors.split(','):
            author = author.strip()
            if author:
                graph.add_node(author, type='author')
                graph.add_edge(title, author, relation='authored_by')

    # Add edge to journal node
    if isinstance(journal, str) and journal.strip():
        graph.add_node(journal, type='journal')
        graph.add_edge(title, journal, relation='in_journal')

    # Add edges for cited papers
    if not isinstance(citations, str):
        citations = ''
    for cited in citations.split(','):
        cited = cited.strip()
        if cited:
            graph.add_node(cited, type='paper')
            graph.add_edge(title, cited, relation='cites')

def find_by_author(author):
    """
    Returns a list of papers authored by the given author.
    """
    return [node for node in graph.predecessors(author)
            if graph.nodes[node].get('type') == 'paper']

def find_citers(paper):
    """
    Returns a list of papers that cite the given paper.
    """
    return [node for node in graph.predecessors(paper)
            if graph[node][paper].get('relation') == 'cites']

def export_graph():
    """
    Exports the entire graph as a dict with nodes and edges for visualization.
    """
    return {
        'nodes': [
            {'id': node, 'type': data.get('type')}
            for node, data in graph.nodes(data=True)
        ],
        'edges': [
            {'source': src, 'target': dst, 'relation': data.get('relation')}
            for src, dst, data in graph.edges(data=True)
        ]
    }

def get_most_cited_papers(top_n=5):
    """
    Returns a list of top N most cited papers.
    """
    citation_count = {}
    for node in graph.nodes:
        if graph.nodes[node].get('type') == 'paper':
            citation_count[node] = len(find_citers(node))

    sorted_papers = sorted(citation_count.items(), key=lambda x: x[1], reverse=True)
    return [{'paper': title, 'citations': count} for title, count in sorted_papers[:top_n]]