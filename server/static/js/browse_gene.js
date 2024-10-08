// Div IDs
const GENE_MAP = "gene-map";
const SEQUENCES_LIST = "sequences-list";

const TRANSCRIPT_COUNT = "transcript-count";
const TRANSCRIPT_FILTERS = "transcript-filter-checkboxes";
const ALL_TRANSCRIPTS = "all-transcripts";
const TRANSCRIPT_INFO_TABLE = "transcript-info-table";

const DNA_SEQ_DIV = "dna-sequence-div";
const PRE_RNA_SEQ_DIV = "pre-rna-sequence-div";
const SPLICED_RNA_SEQ_DIV = "spliced-rna-sequence-div";
const CODING_RNA_SEQ_DIV = "coding-rna-sequence-div";
const PROTEIN_SEQ_DIV = "protein-sequence-div";

const DNA_SEQ = "dna-sequence";
const PRE_RNA_SEQ = "pre-rna-sequence";
const SPLICED_RNA_SEQ = "spliced-rna-sequence";
const CODING_RNA_SEQ = "coding-rna-sequence";
const PROTEIN_SEQ = "protein-sequence";

const SVGNS = "http://www.w3.org/2000/svg";
const POLYLINE_TSS_SHAPE = "0,1, 0,0.1, 0.5,0.1, 0.4,0.2 0.55,0.1 0.4,0"
const INVERTED_POLYLINE_TSS_SHAPE = "0.5,0 0.5,0.9 0.05,0.9 0.1,0.8 0,0.9 0.1,1"
const POLYLINE_TERMINATOR_SHAPE = "0.5,1 0.5,0.1 0.2,0.1 0.8,0.1"
const INVERTED_TERMINATOR_SHAPE = "0.5,0 0.5,0.9 0.8,0.9 0.2,0.9"

// Fetch transcript annotation data from the server
async function fetch_transcript_annotation(genome_name, gene_symbol, transcript_accession) {
    const url = `/api/transcripts/${genome_name}/${gene_symbol}/${transcript_accession}`;
    let res = await fetch(url, {method: "GET"});
    if (res.status !== 200) {
        return(false);
    }
    res = await res.json()
    return(res);
}

// Reindex the transcript annotations to be relative to the gene start
// Or (if normalize is false) to be floats between 0 and 1
// Good to note: gene_start always seems to be less than gene_end (even on the minus strand)
function reindex_transcript_annotations(gene_data, transcript_data, normalize=false) {
    const gene_start = Number(gene_data.locus[2]);
    const gene_end = Number(gene_data.locus[3]);
    const gene_length = gene_end - gene_start;

    // Reindex the annotations to be relative to the gene starts
   let reindexed_annotations = {
        bounds: add_to_array(transcript_data.bounds, -1*gene_start),
        CDSs: transcript_data.CDSs.map(element => element.map(sub_element => sub_element - gene_start)),
        exons: transcript_data.exons.map(element => element.map(sub_element => sub_element - gene_start)),
    };

    // If we want to normalize the annotations, divide them by the gene length
    if (normalize) {
        reindexed_annotations = {
            bounds: reindexed_annotations.bounds.map(element => element / gene_length),
            CDSs: reindexed_annotations.CDSs.map(element => element.map(sub_element => sub_element / gene_length)),
            exons: reindexed_annotations.exons.map(element => element.map(sub_element => sub_element / gene_length)),
        };
    }
    
    // Replace the fields of transcript_data with the reindexed annotations
    transcript_data.bounds = reindexed_annotations.bounds;
    transcript_data.CDSs = reindexed_annotations.CDSs;
    transcript_data.exons = reindexed_annotations.exons;
    return(transcript_data);
}

// Draw the gene map
async function draw_gene_map(gene_data, normalized_annotations, strand) {
    const max_height = 150;
    const max_width = 1000;

    // Initialize the map div and the svg element
    let map_div = $(`#${GENE_MAP}`);
    let svg_div = document.createElementNS(SVGNS, "svg");
    svg_div.setAttribute("width", max_width);
    svg_div.setAttribute("height", max_height);

    // Draw rectangles for the exons
    let exons = normalized_annotations.exons;
    for (let exon of exons) {
        let exon_rect = document.createElementNS(SVGNS, "rect");
        set_many_attributes(exon_rect, {
            "class": "exon",
            "data-exon-name": `Exon ${exons.indexOf(exon)+1}`,
            "x": max_width * exon[0],
            "y": strand == "plus" ? max_height/4 : max_height/2,
            "width": max_width * (exon[1] - exon[0]),
            "height": max_height/4,
        });
        svg_div.append(exon_rect);
    }

    // Draw rectangles for the CDSs (will overlay the exons)
    let CDSs = normalized_annotations.CDSs;
    for (let CDS of CDSs) {
        let CDS_rect = document.createElementNS(SVGNS, "rect");
        set_many_attributes(CDS_rect, {
            "class": "cds",
            // "data-CDS-name": `CDS ${CDSs.indexOf(CDS)+1}`,
            "href": "#",
            "data-toggle": "tooltip",
            "data-placement": "top",
            "title": `CDS ${CDSs.indexOf(CDS)+1}`,
            "x": max_width * CDS[0],
            "y": strand == "plus" ? max_height/4 : max_height/2,
            "width": max_width * (CDS[1] - CDS[0]),
            "height": max_height/4,
            "fill": "#FF7B9C",
        });
        svg_div.append(CDS_rect);
    }

    // Use transcript.bounds to draw a TSS and a terminator
    let rescaled_transcript_bounds = normalized_annotations.bounds.map(element => element * max_width);

    // Transform the generic TSS shape to fit the bounds
    // The entire transformation is different depending on the strand (to make it look good)
    let tss_points;
    if (strand == "minus") {
        tss_points = INVERTED_POLYLINE_TSS_SHAPE;
        tss_points = scale_points(tss_points, [50, max_height/2]);
        // TSS should be at the end of the gene on the minus strand
        tss_points = translate_points(tss_points, [rescaled_transcript_bounds[1]-27, (max_height/2)-2]);
    } else if (strand == "plus") {
        tss_points = POLYLINE_TSS_SHAPE;
        tss_points = scale_points(tss_points, [50, max_height/2]);
        tss_points = translate_points(tss_points, [rescaled_transcript_bounds[0]+2, 2]);
    }
        // Draw the TSS as a polyline
    let tss_polyline = document.createElementNS(SVGNS, "polyline");
    set_many_attributes(tss_polyline, {
        "points": tss_points,
        "fill": "none",
        "stroke": "black",
        "stroke-width": 5,
    });
    svg_div.append(tss_polyline);

    // Transform the generic terminator shape to fit the bounds
    // The entire transformation is different depending on the strand
    let terminator_points;
    if (strand == "minus") {
        terminator_points = INVERTED_TERMINATOR_SHAPE;
        terminator_points = scale_points(terminator_points, [50, max_height/2]);
        terminator_points = translate_points(terminator_points, [rescaled_transcript_bounds[0]-27, (max_height/2)-2]);
    } else if (strand == "plus") {
        terminator_points = POLYLINE_TERMINATOR_SHAPE;
        terminator_points = scale_points(terminator_points, [50, max_height/2]);
        terminator_points = translate_points(terminator_points, [rescaled_transcript_bounds[1]-27, 2]);
    }
    let terminator_polyline = document.createElementNS(SVGNS, "polyline");
    set_many_attributes(terminator_polyline, {
        "points": terminator_points,
        "fill": "none",
        "stroke": "black",
        "stroke-width": 5,
    });
    svg_div.append(terminator_polyline);

    // Make a line that spans the length of the gene (and the length of the SVG)
    let gene_line = document.createElementNS(SVGNS, "line");
    set_many_attributes(gene_line, {
        "x1": 0,
        "y1": max_height/2,
        "x2": max_width,
        "y2": max_height/2,
        "stroke": "black",
        "stroke-width": 5,
    });
    svg_div.append(gene_line);

    // Make a second one above or below the gene line depending on the strand
    let gene_line_template = document.createElementNS(SVGNS, "line");
    const offset = max_height/15; 
    set_many_attributes(gene_line_template, {
        "x1": 0,
        "y1": strand=="plus" ? max_height/2 + offset : max_height/2 - offset,
        "x2": max_width,
        "y2": strand=="plus" ? max_height/2 + offset : max_height/2 - offset,
        "stroke": "black",
        "stroke-width": 5,
    });
    svg_div.append(gene_line_template);

    // Draw ticks along the gene line (spacing is either 10, 50, 100, 500, etc.)
    let gene_length = gene_data.locus[3] - gene_data.locus[2];
    let tick_interval_coords = gene_length / 5; // Start with 5 ticks then round to the nearest order of magnitude
    tick_interval_coords = Math.pow(10, Math.floor(Math.log10(tick_interval_coords)));
    // Calculate the pixel interval and the number of ticks
    let tick_interval_pixels = max_width * tick_interval_coords / gene_length;
    let tick_count = Math.floor(gene_length / tick_interval_coords);
    // If every order of magnutide is too many ticks, increase the interval by 5x (to 50, 500, etc.)
    if (tick_count > 20) {
        tick_interval_coords *= 5;
        // Recalculate the pixel interval and the number of ticks
        tick_interval_pixels = max_width * tick_interval_coords / gene_length;
        tick_count = Math.floor(gene_length / tick_interval_coords);
    }

    // Draw the ticks (iterate either forwards or backwards depending on the strand)
    // for (let i = strand=="plus" ? 0 : tick_count; strand=="plus" ? i<tick_count : i>0; strand=="plus" ? i++ : i--) {
    for (let i = 0; i <= tick_count; i++) {
        let tick = document.createElementNS(SVGNS, "line");
        const tick_x_position_pixels = strand=="plus" ? (i*tick_interval_pixels) : (max_width - (i*tick_interval_pixels));
        set_many_attributes(tick, {
            "x1": tick_x_position_pixels,
            "y1": max_height/2 - 10,
            "x2": tick_x_position_pixels,
            "y2": max_height/2 + 10,
            "stroke": "black",
            "stroke-width": 1,
        });
        svg_div.append(tick);

        // Add a text element for the tick (first tick is coord, then each is an increment)
        let tick_text = document.createElementNS(SVGNS, "text");
        set_many_attributes(tick_text, {
            "x": strand=="plus" ? (tick_x_position_pixels + 20) : (tick_x_position_pixels - 20),
            "y": strand=="plus" ? (max_height/2 + 20) : (max_height/2 - 10),
            "font-size": 16,
            "text-anchor": strand=="plus" ? "start" : "end",
        });

        // If it's the first tick, show the coordinate (also depends on the strand)
        if (i === 0) {
            // tick_text.textContent = `Chr. ${gene_data.locus[0]} @ ${format_big_number(gene_data.locus[2])}`;
            tick_text.textContent = "0";
        } else {
            // Let's try only showing the increment (e.g. +1000, +2000, +3000, etc.)
            // I think it's so much easier to read!
            tick_text.textContent = strand=="plus" ? `+${format_big_number(i*tick_interval_coords)}` : `-${format_big_number(i*tick_interval_coords)}`;
        }
        // Turn the text element 45 degrees
        tick_text.setAttribute("transform", `rotate(45, ${tick_x_position_pixels}, ${max_height/2})`);
        svg_div.append(tick_text);
    }
    
    // Expand the svg div by like 10% on each side to allow things to be drawn outside the bounds
    svg_div.setAttribute("viewBox", `${max_width*-0.05} ${max_height*-0.05} ${max_width*1.1} ${max_height*1.1}`);
    // Clear the old SVG div and append the new one
    map_div.empty();
    // Append the final SVG div to the gene-map div :)
    map_div.append(svg_div);
}

// This is the main function to load in a new transcript
async function load_transcript(transcript_id) {
    // Get the gene data from the hidden div
    const gene_data = JSON.parse($("#gene-data").text());
    const genome_name = gene_data.genome_name;
    const gene_symbol = gene_data.symbol;

    // Fetch the transcript data!
    fetch_transcript_annotation(genome_name, gene_symbol, transcript_id)
        .then((transcript_data) => {
            if (transcript_data) {

                // It's nice to log the transcript data for debugging :)
                console.log(transcript_data);

                // Update the transcript info table
                $(`#${TRANSCRIPT_INFO_TABLE}`).empty();
                $(`#${TRANSCRIPT_INFO_TABLE}`).append(`
                    <tr>
                        <td>NCBI Accession</td>
                        <td><a href="https://www.ncbi.nlm.nih.gov/nuccore/${transcript_data.ncbi_accession}" target="_blank">${transcript_data.ncbi_accession} <i class="bi bi-box-arrow-up-right"></i>
                        </a></td>
                    </tr>
                `);
                $(`#${TRANSCRIPT_INFO_TABLE}`).append(`
                    <tr>
                        <td>Annotation Source</td>
                        <td>${transcript_data.source}</td>
                    </tr>
                `);
                $(`#${TRANSCRIPT_INFO_TABLE}`).append(`
                    <tr>
                        <td>Curation Status</td>
                        <td>${transcript_data.ncbi_accession.startsWith("N") ? "Curated" : "Predicted"}</td>
                    </tr>
                `);
                $(`#${TRANSCRIPT_INFO_TABLE}`).append(`
                    <tr>
                        <td>Transcript Biotype</td>
                        <td>${transcript_data.biotype.replace("_", " ")}</td>
                    </tr>
                `);

                // Normalize the annotations and draw the gene map
                const normalized_annotations = reindex_transcript_annotations(gene_data, transcript_data, true);
                // Clear the old gene map div
                $(`#${GENE_MAP}`).empty();
                draw_gene_map(gene_data, normalized_annotations, strand=gene_data.locus[1]);

                // Fill the sequences field with the transcript data
                $("#pre-rna-sequence")[0].setAttribute("value", transcript_data.sequence);
                if (transcript_data.exonic_sequence === null) {
                    $("#spliced-rna-sequence")[0].setAttribute("value", "Not Available");
                    $("#spliced-rna-sequence-div").children().prop("disabled", true);
                } else {
                    $("#spliced-rna-sequence")[0].setAttribute("value", transcript_data.exonic_sequence);
                    $("#spliced-rna-sequence-div").children().prop("disabled", false);
                }
                if (transcript_data.coding_sequence === null) {
                    $("#coding-rna-sequence")[0].setAttribute("value", "Not Available");
                    $("#coding-rna-sequence-div").children().prop("disabled", true);
                } else {
                    $("#coding-rna-sequence")[0].setAttribute("value", transcript_data.coding_sequence);
                    $("#coding-rna-sequence-div").children().prop("disabled", false);
                }
                if (transcript_data.amino_acid_sequence === null) {
                    $("#protein-sequence")[0].setAttribute("value", "Not Available");
                    $("#protein-sequence-div").children().prop("disabled", true);
                } else {
                    $("#protein-sequence")[0].setAttribute("value", transcript_data.amino_acid_sequence);
                    $("#protein-sequence-div").children().prop("disabled", false);
                }
            }
        });
}

// Function to update the transcript list based on the checkboxes (and on document load)
function update_transcript_list(gene_data, transcripts, force_main_variant=false) {
    let include_non_refseq = $(`#${TRANSCRIPT_FILTERS} #non-refseq`).prop("checked");
    let include_predicted = $(`#${TRANSCRIPT_FILTERS} #predicted`).prop("checked");

    // Filter the transcripts based on the checkboxes
    let filtered_transcripts = transcripts.filter(transcript => {
        return (include_non_refseq || transcript.source === "BestRefSeq") &&
               (include_predicted || transcript.ncbi_accession.startsWith("N"));
    });

    // Update the all transcripts dropdown
    const prev_transcript = $(`#${ALL_TRANSCRIPTS}`).val(); // Save this for later
    $(`#${ALL_TRANSCRIPTS}`).empty();
    for (let transcript of filtered_transcripts) {
        $(`#${ALL_TRANSCRIPTS}`).append(`<option value="${transcript.ncbi_accession}">${transcript.product}</option>`);
    }

    // Update the transcript count
    $(`#${TRANSCRIPT_COUNT}`).html(`
        ${gene_data.symbol} encodes <b>
        ${filtered_transcripts.length} transcript${filtered_transcripts.length === 1 ? "" : "s"}</b>
    `);

    // Choose a transcript to display by default
    if (force_main_variant) {
        // Select anything that contains "variant 1" or "variant A" or "isoform 1"
        const variant1_transcript = filtered_transcripts.find(transcript => transcript.product.match(/variant 1|variant A|isoform 1/i));
        if (variant1_transcript) {
            $(`#${ALL_TRANSCRIPTS}`).val(variant1_transcript.ncbi_accession);
        }
    } else if (prev_transcript in filtered_transcripts.map(transcript => transcript.ncbi_accession)) {
        // Set the previously-selected transcript if it's still in the list
        $(`#${ALL_TRANSCRIPTS}`).val(prev_transcript);
    } else {
        // Otherwise, select the first transcript in the list
        $(`#${ALL_TRANSCRIPTS}`).val(filtered_transcripts[0].ncbi_accession);
    }

}

$(document).ready(function() {

    // Get the gene object and list of transcript objects from the hidden div
    const gene_data = JSON.parse($("#gene-data").text());
    const transcripts = JSON.parse($("#transcripts-list").text());

    // Add an event listener to the checkboxes in the transcript filters
    $(`#${TRANSCRIPT_FILTERS}`).find("input[type='checkbox']").change(function() {
        update_transcript_list(gene_data, transcripts, force_main_variant=false);
    });
    
    // Add an event listener to the all transcripts dropdown
    $(`#${ALL_TRANSCRIPTS}`).change(function() {
        const transcript_id = $(this).val();
        load_transcript(transcript_id);
    });

    // Update the transcript list on document load (to preselect the first transcript)
    // Then load whichever transcript is selected by default
    update_transcript_list(gene_data, transcripts, force_main_variant=true);
    load_transcript($(`#${ALL_TRANSCRIPTS}`).val());
});