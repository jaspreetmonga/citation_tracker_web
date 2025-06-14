
Citation Tracker Web Application - Instructions

This guide explains how to run the Citation Tracker web application locally.

--------------------------------------------------
1. Project Overview:
--------------------------------------------------
This is a web-based application built with Flask (Python) for backend and D3.js for frontend visualization.
It allows users to:
- Add academic papers along with authors, journals, and citations.
- Upload bibliographic data in CSV or JSON.
- Visualize the citation graph using D3.js.
- Query papers by author or citation.

--------------------------------------------------
2. Project Structure:
--------------------------------------------------
citation_tracker_web/
│
├── main.py                  # Flask app entry point
├── citation_graph.py        # NetworkX graph handler
├── requirements.txt         # Required Python packages
├── templates/
│   └── dashboard.html       # Main UI template
├── static/
│   ├── style.css            # Styling for UI
│   └── script.js            # JS for visualization and interactivity
└── uploads/                 # Uploaded CSV/JSON files (auto-created)

--------------------------------------------------
3. Setup Instructions:
--------------------------------------------------

A. Environment Setup:
---------------------
1. Ensure Python 3.8+ is installed.
2. (Optional but recommended) Create a virtual environment:

   On Windows:
       python -m venv venv
       venv\Scripts\activate

   On macOS/Linux:
       python3 -m venv venv
       source venv/bin/activate

3. Install required packages:
       pip install -r requirements.txt

B. Running the Application:
---------------------------
1. Run the Flask app:
       python main.py

2. Open your browser and go to:
       http://127.0.0.1:5000/

--------------------------------------------------
4. How to Use:
--------------------------------------------------

A. Manual Entry:
----------------
- Fill in the Paper Title, Authors, Journal, Year, and Citations in the form.
- Submit to add the paper to the graph.

B. Uploading a Dataset:
-----------------------
- Upload a CSV or JSON file with the required fields:
    - title, authors, journal, year, citations
- The system will parse and add each entry.

C. Visualization:
-----------------
- Once entries are added, the interactive graph will auto-update.
- Nodes are colored by type: paper, author, journal.
- Edges show citation or authorship relations.

--------------------------------------------------
5. Example CSV Format:
--------------------------------------------------
title,authors,journal,year,citations
Paper A,Author X,Journal Y,2020,"Paper B, Paper C"
Paper B,Author Y,Journal Z,2019,""

--------------------------------------------------
6. Queries (via URL):
--------------------------------------------------
- View all papers by an author:
    http://127.0.0.1:5000/search/author/Author%20X

- View papers citing a paper:
    http://127.0.0.1:5000/search/citations/Paper%20B

--------------------------------------------------
7. Notes:
--------------------------------------------------
- The graph is stored in memory and will reset on server restart.
- D3.js ensures smooth visualization of complex networks.
- To deploy this app publicly, consider hosting on Heroku or Railway.

--------------------------------------------------
Developed for: NLP Applications Assignment
