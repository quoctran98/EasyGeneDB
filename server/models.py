from server.helper import settings, load_tsv_data
from server.dna_tools import reverse_complement, transcribe_pre_rna, splice_rna, translate_rna

class Genome():
    def __init__(self, name: str):
        self.name = name
        self.dir = f"{settings.DATA_DIR}/{name}"

        # Load in a table of genes for this genome from a TSV file
        # There should be some error handling here eventually
        genome_dir = f"{settings.DATA_DIR}/{name}"
        self.genes_table = load_tsv_data(f"{genome_dir}/genes.tsv")

    def get_gene_by_symbol(self, symbol):
        """Get a Gene object by its Gene Symbol"""
        data = next((gene for gene in self.genes_table if gene["symbol"] == symbol), None)
        if data is not None:
            # This acts as a pointer to the Genome object!
            data["genome"] = self 
            return Gene(**data)
        
    def search_transcripts_index(self, gene_symbol):
        """Search the index file for a gene symbol and return the file index for its transcripts"""
        index_file = load_tsv_data(f"{self.dir}/transcripts/index.tsv")
        for row in index_file:
            if row["gene_symbol"] == gene_symbol:
                return(row["file_index"])
        return(None)
    
    def get_sequence_by_coord(self, chromosome:str, start_coord:int, end_coord:int):
        """Get a sequence from the genome by reading specific bytes from the file"""
        # Find the right file and the start and end bytes
        chromosome_fname = f"{self.dir}/sequences/chr{chromosome}.txt"
        # Each character is a byte in an ASCII-encoded file
        start_bytes = start_coord - 1 # REMEMBER! 0-based indexing
        end_bytes = end_coord
        # Read the file
        sequence = None
        with open(chromosome_fname, "r") as f:
            f.seek(start_bytes)
            sequence = f.read(end_bytes - start_bytes)
        if sequence is None:
            raise ValueError(f"Sequence not found for {chromosome}:{start_coord}-{end_coord}")
        return(sequence)

    @classmethod
    def load(cls, name):
        """Load a Genome object into memory"""
        return(cls(name=name))

class Gene():
    def __init__(self, genome: str,
                 ncbi_gene_id: str, symbol: str, name: str, type: str,
                 locus: tuple, transcripts: list):
        self.genome = genome
        self.ncbi_gene_id = ncbi_gene_id
        self.symbol = symbol
        self.name = name
        self.type = type
        self.locus = eval(locus) # (chromosome, orientation, start, end)
        self.transcripts = list(set(eval(transcripts))) # List of NCBI transcript accession numbers
        self.nm_transcripts = [transcript for transcript in self.transcripts if transcript.startswith("NM_")]
        self.nr_transcripts = [transcript for transcript in self.transcripts if transcript.startswith("NR_")]
        self.xm_transcripts = [transcript for transcript in self.transcripts if transcript.startswith("XM_")]
        self.xr_transcripts = [transcript for transcript in self.transcripts if transcript.startswith("XR_")]

    @property
    def summary_dict(self):
        """Return a dictionary of the gene's summary information to pass to JavaScript"""
        return({
            "genome_name": self.genome.name,
            "ncbi_gene_id": self.ncbi_gene_id,
            "symbol": self.symbol,
            "name": self.name,
            "type": self.type,
            "locus": self.locus,
            "transcripts": self.transcripts,
            "sequence": self.sequence
        })
    
    def get_transcripts_metadata(self):
        """Return a list of dictionaries with the names (and other metadata) of the transcripts"""
        transcripts = set([self.get_transcript_by_accession(transcript) for transcript in self.transcripts])
        transcripts_metadata = [transcript.metadata_dict() for transcript in transcripts if transcript is not None]
        return(transcripts_metadata)
    
    def get_transcript_by_accession(self, accession):
        """Get a specific Transcript object by its NCBI accession"""
        # Find and load the right file
        file_index = self.genome.search_transcripts_index(self.symbol)
        if file_index is None:
            raise ValueError(f"Gene symbol {self.symbol} not found in index")
        file = load_tsv_data(f"{self.genome.dir}/transcripts/{file_index}.tsv", delimiter="\t")
        # Get the data (row) for the specific transcript
        data = next((row for row in file if row["transcript"] == accession), None)
        if data is None:
            return(None)
        # Remove unused keys then create the Transcript object
        keys_to_remove = ["gene", "start_codon", "stop_codon"]
        for key in keys_to_remove:
            data.pop(key, None)
        return Transcript(genome=self.genome, gene=self, **data)
        # Returning None is handled in the routes I have :)

    @property
    def sequence(self):
        """Get the sequence of the gene from the genome"""
        chromosome, orientation, start, end = self.locus
        seq = self.genome.get_sequence_by_coord(chromosome, start, end)
        if orientation == "minus":
            seq = reverse_complement(seq)
        return(seq)

class Transcript():
    def __init__(self, genome: Genome, gene: Gene,
                transcript: str, transcript_biotype: str, product: str, source: str, xref: str,
                 transcript_bounds: tuple, exons: str, CDSs: str):
        # Parent objects
        self.genome = genome
        self.gene = gene

        # Metadata
        self.ncbi_accession = transcript
        self.biotype = transcript_biotype
        self.product = product
        self.predicted = True if self.ncbi_accession.startswith("X") else False
        self.source = source
        self.xrefs = {k:v for k,v in [x.split(":", 1) for x in xref.split(",")]}

        # Sequence information 
        self.bounds = [int(bound) for bound in list(eval(transcript_bounds))]
        self.locus = [gene.locus[0], gene.locus[1], self.bounds[0], self.bounds[1]]
        self.exons = [(int(bound[0]), int(bound[1])) for bound in list(eval(exons))]
        self.CDSs = [(int(bound[0]), int(bound[1])) for bound in list(eval(CDSs))]

    def summary_dict(self):
        """Return a dictionary of the transcript's summary information to pass to JavaScript"""
        return({
            "genome_name": self.genome.name,
            "gene_symbol": self.gene.symbol,
            "ncbi_accession": self.ncbi_accession,
            "biotype": self.biotype,
            "product": self.product,
            "predicted": self.predicted,
            "source": self.source,
            "xrefs": self.xrefs,
            "bounds": self.bounds,
            "locus": self.locus,
            "exons": self.exons,
            "CDSs": self.CDSs,
            "sequence": self.sequence,
            "exonic_sequence": self.exonic_sequence,
            "coding_sequence": self.coding_sequence,
            "amino_acid_sequence": self.amino_acid_sequence
        })
    
    def metadata_dict(self):
        """Return a dictionary of the transcript's metadata (for Jinja2)"""
        return({
            "genome_name": self.genome.name,
            "gene_symbol": self.gene.symbol,
            "ncbi_accession": self.ncbi_accession,
            "biotype": self.biotype,
            "product": self.product,
            "source": self.source,
            "xrefs": self.xrefs,
        })
    
    # This is called a lot -- hopefully the files are cached in memory?
    # I should check :)
    @property
    def sequence(self):
        """Get the transcribed pre-RNA sequence of the transcript"""
        trancript_seq = transcribe_pre_rna(self.genome.get_sequence_by_coord(
                self.locus[0], int(self.bounds[0]), int(self.bounds[1])))
        # Don't forget to reverse complement the sequence if the gene is on the minus strand
        if self.locus[1] == "minus":
            trancript_seq = reverse_complement(trancript_seq, rna=True)
        return(trancript_seq)

    @property
    def exonic_sequence(self):
        """Get the spliced exonic RNA sequence of the transcript"""
        if len(self.exons) < 1:
            return(None)
        exons = [(int(bound[0]), int(bound[1])) for bound in self.exons]
        return(splice_rna(
            rna_sequence=self.sequence, 
            exon_bounds=exons,
            reindex=int(self.locus[2]),
            reverse=True if self.locus[1] == "minus" else False
        ))
    
    @property
    def coding_sequence(self):
        """Get the spliced coding RNA sequence of the transcript (start codon to stop codon)"""
        if len(self.CDSs) < 1:
            return(None)
        if self.biotype != "mRNA":
            return(None)
        cds = [(int(bound[0]), int(bound[1])) for bound in self.CDSs]
        return(splice_rna(
            rna_sequence=self.sequence, 
            exon_bounds=cds,
            reindex=int(self.locus[2]),
            reverse=True if self.locus[1] == "minus" else False
        ))

    # Probably should be a property of the Protein class
    # But without any other Protein operations needed, we just won't use a Protein class for now
    @property
    def amino_acid_sequence(self):
        """Get the protein sequence of the transcript"""
        if self.biotype != "mRNA":
            return(None)
        return(translate_rna(self.coding_sequence))
    
    def write_fasta(self, filename):
        """Write all the sequences to a FASTA file"""
        with open(filename, "w") as f:
            text = f">genomic_sequence\n{self.sequence}\n"
            text += f">transcript_sequence\n{self.sequence}\n"
            text += f">exonic_sequence\n{self.exonic_sequence}\n"
            text += f">cds_sequence\n{self.coding_sequence}\n"
            text += f">protein_sequence\n{self.amino_acid_sequence}\n"
            f.write(text)

class Protein():
    def __init__(self, accession: str, name: str, sequence: str):
        self.accession = accession
        self.name = name
        self.sequence = sequence
