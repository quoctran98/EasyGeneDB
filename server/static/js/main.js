/*
    This script is called in every page of the website.
    Use it to define functions that are used in multiple pages.
    It also does a few things, especially for search bar stuff.
*/

// Define a few divs
SEARCH_BAR_FORM_DIVS = ["top-search-bar", "index-search-bar"]; // Index search bar might not exist

// Initialize some stuff :)
$(document).ready(function() {

    // Toggle all Bootstrap tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })

    // Add an event listener to the <input> elements within the search bar forms
    for (let div_id of SEARCH_BAR_FORM_DIVS) {
        $(`#${div_id} input`).on("input", function() {
            update_datalist(this);
        });
    }

});

// Update the datalist of a search bar using an api call to the server
async function update_datalist(search_bar) {
    const query = $(search_bar).val();

    // Get the genome name from the gene-data div (if it exists, otherwise default to "hg38")
    let genome_name;
    if ($("#gene-data").length === 0) {
        genome_name = "hg38";
    } else {
        genome_name = JSON.parse($("#gene-data").text()).genome;
    }
    const url = `/api/dynamic_search/${genome_name}?query=${query}`;

    if (query.length > 2) {
        let response = await fetch(url);
        let data = await response.json(); // One big object (keys are gene symbols, values are gene names)

        const datalist_id = $(search_bar).attr("list");
        let datalist = $(`#${datalist_id}`);
        datalist.empty();
        for (let symbol in data) {
            let new_option = $(`<option value="${symbol}">${data[symbol]}</option>`);
            datalist.append(new_option);
        }
    }
}


// Function to copy the sequence child of a parent div to the clipboard
function copy_sequence(event, parent_div_id) {
    let sequence_div = $(`#${parent_div_id} #seq`)[0];
    navigator.clipboard.writeText(sequence_div.value)
        .then(() => {
            // Set and show the tooltip (make sure it stays even after mouseout)
            $(event.target).attr("data-original-title", "Copied!");
            $(event.target).attr("data-placement", "left");
            $(event.target).tooltip("show");
            // Reset the tooltip after 1 second
            setTimeout(() => {
                $(event.target).attr("data-original-title", "");
                $(event.target).tooltip("hide");
            }, 1000);
    
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
        });
}

// Format a number with commas
function format_big_number(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Set many attributes of an element at once
function set_many_attributes(element, attributes) {
    for (let key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    // No need to return anything, the element is modified in place :)
}

// Call blur_background() when any modals are opened
function blur_background() {
    let to_blur = $(".gets-blurred");
    for (let i = 0; i < to_blur.length; i++) {
        to_blur[i].style = `
            -webkit-filter: blur(5px);
            -moz-filter: blur(5px);
            -o-filter: blur(5x);
            -ms-filter: blur(5px);
            filter: blur(5px);
        `;
    }
}

// Call unblur_background() when any modals are closed
function unblur_background() {
    let to_unblur = $(".gets-blurred");
    for (let i = 0; i < to_unblur.length; i++) {
        to_unblur[i].style = `
            -webkit-filter: blur(0px);
            -moz-filter: blur(0px);
            -o-filter: blur(0px);
            -ms-filter: blur(0px);
            filter: blur(0px);
        `;
    }
}

// Add or subtract the same number from all elements of an array
function add_to_array(array, number) {
    return(array.map(element => element + number));
}

// Parse strings representations to arrays and arrays of arrays
// ChatGPT wrote this...
function parse_string_arrays(input_string) {
        // Handle the special cases of empty arrays
        if (input_string === '') {
            return([[]]) // Returning only [] makes it undefined for some reason??
        } else if (input_string === '[]') {
            return([[]]);
        }

        // Check if the input is a single tuple or an array of tuples
        const isArray = input_string.startsWith('[');
    
        // Step 1: Remove the outer brackets if it's an array
        const cleanedString = isArray ? input_string.replace(/[\[\]]/g, '') : input_string;
    
        // Step 2: Split the string by the closing parenthesis followed by a comma if it's an array
        const tuplesArray = isArray 
            ? cleanedString.split(/\),\s*\(/).map(tuple => tuple.trim())
            : [cleanedString]; // If it's a single tuple, wrap it in an array
    
        // Step 3: Convert each tuple string into an array of numbers
        return tuplesArray.map(tuple => {
            // Remove parentheses and single quotes
            const cleanedTuple = tuple.replace(/[()']/g, '');
            // Split by comma and convert to numbers
            return cleanedTuple.split(',').map(Number);
        });
}

// Translate XML points "x1,y1 x2,y2 x3,y3" with a vector [dx, dy]
function translate_points(points, vector) {
    let new_points = points.split(" ").map(point => {
        let [x, y] = point.split(",");
        return `${Number(x) + vector[0]},${Number(y) + vector[1]}`;
    });
    return(new_points.join(" "));
}

// Scale XML points "x1,y1 x2,y2 x3,y3" by a factor vector [fx, fy]
function scale_points(points, vector) {
    let new_points = points.split(" ").map(point => {
        let [x, y] = point.split(",");
        return `${Number(x) * vector[0]},${Number(y) * vector[1]}`;
    });
    return(new_points.join(" "));
}

// Rotate XML points "x1,y1 x2,y2 x3,y3" by an angle in degrees
function rotate_points(points, angle) {
    let new_points = points.split(" ").map(point => {
        let [x, y] = point.split(",");
        let x_rot = x*Math.cos(angle) - y*Math.sin(angle);
        let y_rot = x*Math.sin(angle) + y*Math.cos(angle);
        return `${x_rot},${y_rot}`;
    });
    return(new_points.join(" "));
}

// Get the unspliced RNA sequence of a gene given its transcript_bounds and orientation
function transcribe_RNA(DNA_sequence, reindexed_transcript_bounds, orientation) {
    let RNA_sequence = "";
    if (orientation === "plus") {
        for (let bounds of transcript_bounds) {
            RNA_sequence += DNA_sequence.slice(bounds[0], bounds[1]);
            RNA_sequence = RNA_sequence.replace(/t/gi, "U");
        }
    } else if (orientation === "minus") {
        for (let bounds of transcript_bounds) {
            RNA_sequence += DNA_sequence.slice(bounds[0], bounds[1]);
            RNA_sequence = RNA_sequence.replace(/a/gi, "U");
        }
    }
    return(RNA_sequence);
}