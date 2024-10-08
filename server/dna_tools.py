"""
This is just a bunch of helper functions for manipulating DNA sequences, etc
NOTE: ALL REINDEXING SHOULD BE HANDLED BY THE FUNCTIONS THEMSELVES
We will treat all sequences as 1-indexed in other contexts.
The only OTHER reindexing that happens outside of this script is in Genome.get_sequence_by_coord()
"""

def order_bounds(bounds: list):
    """Order a list of bounds by their start positions"""
    return(sorted(bounds, key=lambda x: x[0]))

def reverse_complement(sequence: str, rna: bool = False):
    """Get the reverse complement of a DNA or RNA sequence"""
    complement = {"A": "T", "T": "A", "C": "G", "G": "C",
                  "a": "t", "t": "a", "c": "g", "g": "c"}
    if rna:
        complement["U"] = "A"
        complement["u"] = "a"
        complement["A"] = "U"
        complement["a"] = "u"
    return("".join([complement[base] for base in reversed(sequence)]))

def transcribe_pre_rna(dna_sequence: str):
    """Transcribe a DNA sequence into pre-RNA without splicing etc."""
    rna_sequence = dna_sequence.replace("T", "U").replace("t", "u")
    return(rna_sequence)

def splice_rna(rna_sequence: str, exon_bounds: list, reindex: int = 0, reverse: bool = False):
    """Splice an RNA sequence into the exonic regions only
    This should also work for getting the CDS sequence (replace exons_bounds with cds_bounds)
    Parameters:
    rna_sequence: str - The full RNA sequence
    exon_bounds: list - A list of tuples with the start and end of each exon
    reindex: int - The transcript coordinate offset (set to 0 to not reindex)
    """
    exons = []
    exon_bounds = order_bounds(exon_bounds)
    if reverse: # Reverse the sequence if the gene is on the minus strand (else the bounds are flipped)
        rna_sequence = reverse_complement(rna_sequence, rna=True)
    for bounds in exon_bounds:
        bounds = (bounds[0]-reindex, bounds[1]-reindex+1) # REMEMBER TO REINDEX 
        # (I'm doing this empirically) I still don't get why we need to add 1 to the end bound
        exons.append(rna_sequence[bounds[0]:bounds[1]])
    spliced_sequence = "".join(exons)
    if reverse: # Reverse the sequence back
        spliced_sequence = reverse_complement(spliced_sequence, rna=True)
    return(spliced_sequence)

def translate_rna(cds_sequence: str):
    """Translate an RNA sequence into a protein sequence"""
    codon_table = {
        "UUU": "F", "UUC": "F", "UUA": "L", "UUG": "L",
        "UCU": "S", "UCC": "S", "UCA": "S", "UCG": "S",
        "UAU": "Y", "UAC": "Y", "UAA": "*", "UAG": "*",
        "UGU": "C", "UGC": "C", "UGA": "*", "UGG": "W",
        "CUU": "L", "CUC": "L", "CUA": "L", "CUG": "L",
        "CCU": "P", "CCC": "P", "CCA": "P", "CCG": "P",
        "CAU": "H", "CAC": "H", "CAA": "Q", "CAG": "Q",
        "CGU": "R", "CGC": "R", "CGA": "R", "CGG": "R",
        "AUU": "I", "AUC": "I", "AUA": "I", "AUG": "M",
        "ACU": "T", "ACC": "T", "ACA": "T", "ACG": "T",
        "AAU": "N", "AAC": "N", "AAA": "K", "AAG": "K",
        "AGU": "S", "AGC": "S", "AGA": "R", "AGG": "R",
        "GUU": "V", "GUC": "V", "GUA": "V", "GUG": "V",
        "GCU": "A", "GCC": "A", "GCA": "A", "GCG": "A",
        "GAU": "D", "GAC": "D", "GAA": "E", "GAG": "E",
        "GGU": "G", "GGC": "G", "GGA": "G", "GGG": "G"
    }
    protein = ""
    for i in range(0, len(cds_sequence), 3):
        codon = cds_sequence[i:i+3]
        if len(codon) < 3:
            raise ValueError(f"Invalid codon: {codon}")
        protein += codon_table[codon.upper()]
    return(protein)