### To run locally in development mode:
1. Go to the root directory of the project.
2. Activate the conda environment.
3. Tell flask where to find the application:
    ```
    export FLASK_APP=server.py
    export FLASK_ENV=development
    ```
4. Make sure `.env` file is present in the root directory of the project.
5. Run the application:
    ```
    flask run
    ```

### "Database" Structure:
Each genome is a directory in `DATA_DIR` (specified in `.env` file, default is `data/`).
This is the structure of a sample genome directory:
```
    - hg38/
        - genes.tsv
        - transcripts/
            - index.tsv
            - file_0.tsv
            - file_1.tsv
            - ...
        - sequences/
            - chromosome_1
            - chromosome_2
            - ...
```
BUGS!
http://127.0.0.1:5000/browse/hg38/DMD -- the gene is too long...
http://127.0.0.1:5000/browse/hg38/LRFN1 -- XM_017027033.2 can't be found and NM_020862.2 is duplicated...