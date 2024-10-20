from pydantic_settings import BaseSettings
from flask import request
from flask_caching import Cache
from flask_apscheduler import APScheduler
import csv

# Load settings from .env file
class Settings(BaseSettings):
    FLASK_SECRET_KEY:str
    ENVIRONMENT:str
    DATA_DIR:str
    class Config:
        env_file = ".env"
settings = Settings()

# Connect to MongoDB users database
# users_db = client[settings.USERS_DB_NAME]
# active_users_coll = users_db.active_users
# old_users_coll = users_db.old_users

# Cache for initializing in __init__.py
cache_config = {
    "CACHE_DEBUG": 1,
    "CACHE_DEFAULT_TIMEOUT": 84600, # 24 hours (most things are updated daily)
    "CACHE_TYPE": "FileSystemCache",
    "CACHE_THRESHOLD": 1000,
    "CACHE_DIR": "./server/temp/cache"
}
cache = Cache()

# Scheduler for initializing in __init__.py
scheduler = APScheduler()

###########################
# Helper functions below! #
###########################

# This is a function to format large numbers with commas.
# We use it mainly in Jinja templates.
def format_number(number):
    return("{:,}".format(number))

# Get all the gene types from a list of Gene objects
# Mainly used in the search.html template
def get_unique_gene_types(genes):
    gene_types = set()
    for gene in genes:
        gene_types.add(gene.type)
    return(gene_types)

# Count things (like one would in a list comprehension of dicts) but for Jinja templates
# This is such a bad name and explanation but it's fine.
def count_things(list, attr, value):
    return(sum(1 for item in list if item[attr] == value))

# Call this function to clear all the caches for a game
# If settings are changed or whatever, delete all caches for a game
GAME_PATHS_CACHED = ["search_article", "allowed_article"]
def clear_game_caches(game_id, paths=GAME_PATHS_CACHED):
    # I found a big issue!
    # Filesystem caches store the hash of the key in the filename
    # There's no way to retrieve the keys from the cache unless I write a function to do it
    cache.clear()

# This is to log server errors
def log_error(error_msg, path="./server/logs/errors"):
    # Save this to an output log file
    time = datetime.now(timezone.utc)
    filename = f"{path}/{time.strftime('%Y%m%d-%H%M%S')}.txt"
    try:
        with open(filename, "w") as f:
            f.write(error_msg)
    except:
        print("Couldn't write to log file!")

def load_tsv_data(filename, delimiter="\t"):
    """Load data from a TSV file as a csv object"""
    data = []
    with open(filename, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        for row in reader:
            data.append(row)
    return(data)
