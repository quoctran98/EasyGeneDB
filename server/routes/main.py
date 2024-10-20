from flask import Flask, request, jsonify, Blueprint, render_template, flash, redirect, url_for

from server.helper import settings, cache
from server.models import Genome, Gene

import random

main = Blueprint("main", __name__)

@main.route("/")
def index():
    return(render_template("index.html"))

@main.route("/browse/<genome_name>/<gene_symbol>")
def browse(genome_name, gene_symbol):
    # I don't like that I'm loading the genome into memory each time
    # But this seems like the most elegant is is more scalable :)
    genome = Genome.load(genome_name) 
    if genome is None:
        flash("Genome not found", "alert-danger")
        return(render_template("index.html"))
    gene =  genome.get_gene_by_symbol(gene_symbol)
    if gene is None:
        flash("Gene not found", "alert-danger")
        return(render_template("index.html"))
    return(render_template("gene.html", 
                           gene=gene, 
                           transcripts=gene.get_transcripts_metadata()))

@main.route("/random/<genome_name>")
def random_gene(genome_name):
    allowed_types = ["protein-coding", "miRNA", "rRNA", "tRNA"]
    genome = Genome.load(genome_name)
    if genome is None:
        flash("Genome not found", "alert-danger")
        return(render_template("index.html"))
    gene = random.choice([gene for gene in genome.genes_table if gene["type"] in allowed_types])
    return(redirect(url_for("main.browse", genome_name=genome_name, gene_symbol=gene["symbol"])))

@main.route("/search/<genome_name>", methods=["GET"])
def search(genome_name):
    query = request.args.get("query")
    genome = Genome.load(genome_name)
    if query is None:
        flash("No query provided", "alert-danger")
        return(render_template("index.html"))
    if len(query) < 3:
        flash("Please provide a query with at least 3 characters", "alert-danger")
        return(render_template("index.html"))
    if genome is None:
        flash("Genome not found", "alert-danger")
        return(render_template("index.html"))
    results = genome.search(query)
    return(render_template("search.html", search_query=query, search_results=results))

@main.route("/robots.txt")
def robots():
    return(render_template("robots.txt"))
