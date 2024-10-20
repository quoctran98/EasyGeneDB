from flask import Flask, request, jsonify, Blueprint

from server.helper import settings, cache
from server.models import Genome, Gene

api = Blueprint("api", __name__)

@api.route("/api/transcripts/<genome>/<gene_symbol>/<transcript_accession>")
def get_transcripts(genome, gene_symbol, transcript_accession=None):
    genome = Genome.load(genome)
    if genome is None:
        return(jsonify({"error": "Genome not found"}), 404)
    gene = genome.get_gene_by_symbol(gene_symbol)
    if gene is None:
        return(jsonify({"error": "Gene not found"}), 404)
    transcript = gene.get_transcript_by_accession(transcript_accession)
    if transcript is None:
        return(jsonify({"error": "Transcript not found"}), 404)
    return(jsonify(transcript.summary_dict()))
    
@api.route("/api/dynamic_search/<genome_name>/")
def dynamic_search(genome_name):
    query = request.args.get("query")
    genome = Genome.load(genome_name)
    if query is None:
        return(jsonify({"error": "No query provided"}), 400)
    if len(query) < 3:
        return(jsonify({"error": "Please provide a query with at least 3 characters"}), 400)
    if genome is None:
        return(jsonify({"error": "Genome not found"}), 404)
    results = genome.search(query)
    summarized_results = {gene.symbol: gene.name for gene in results}
    return(jsonify(summarized_results))