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
    
@api.route("/api/search/<genome>/<query>")
def search(genome, query):
    genome = Genome.load(genome)
    if genome is None:
        return(jsonify({"error": "Genome not found"}), 404)
    results = genome.search(query)
    return(jsonify(results))