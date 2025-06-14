from flask import Flask, render_template, request, jsonify
import os
import json
import pandas as pd
from werkzeug.utils import secure_filename
from citation_graph import insert_paper, find_by_author, find_citers, export_graph

app = Flask(__name__)
UPLOADS_DIR = 'uploads'
os.makedirs(UPLOADS_DIR, exist_ok=True)


@app.route('/')
def home():
    return render_template('dashboard.html')


@app.route('/submit-paper', methods=['POST'])
def submit_paper():
    details = request.json
    insert_paper(details)
    return jsonify({'msg': 'Entry added successfully'}), 201


@app.route('/upload-batch', methods=['POST'])
def upload_batch():
    file = request.files['file']
    filename = secure_filename(file.filename)
    path = os.path.join(UPLOADS_DIR, filename)
    ext = filename.split('.')[-1].lower()
    file.save(path)

    if ext == 'csv':
        df = pd.read_csv(path)
        for _, row in df.iterrows():
            insert_paper({
                'title': row.get('title', ''),
                'authors': row.get('authors', ''),
                'journal': row.get('journal', ''),
                'year': row.get('year', ''),
                'citations': row.get('citations', '')
            })
    elif ext == 'json':
        with open(path) as f:
            data = json.load(f)
            for record in data:
                insert_paper(record)

    return jsonify({'msg': 'Batch upload processed'}), 201


@app.route('/search/author/<author_name>')
def search_by_author(author_name):
    return jsonify(find_by_author(author_name))


@app.route('/search/citations/<paper_title>')
def search_citers(paper_title):
    return jsonify(find_citers(paper_title))


@app.route('/visualize')
def visualize_all():
    return jsonify(export_graph())


if __name__ == '__main__':
    app.run(debug=True)
