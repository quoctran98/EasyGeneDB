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

### To build and run a Docker image
0. Generate `requirements.txt` file: `pip list --format=freeze > requirements.txt`
We have to do it this way because of: https://stackoverflow.com/questions/62885911/pip-freeze-creates-some-weird-path-instead-of-the-package-version (we can't use and environment.yml file -- this has caused me a lot of trouble!)
1. Make a `.dockerignore` file to ignore sensitive files, such as `.env` and `.git`
2. Build the image for arm64/amd64: `docker buildx build --platform linux/[arm64/amd64] --load -t quoctran98/easygenedb:[arm64/amd64] .`
3. Create a manifest list: `docker manifest create quoctran98/easygenedb:arm64 quoctran98/easygenedb:amd64` (unsure if I need to do this)
4. Push the image: `docker push quoctran98/easygenedb:[arm64/amd64]`
5. Pull the image remote: `docker pull quoctran98/easygenedb:[arm64/amd64]`
6. Transfer the .env file to the server using `scp` or something
7. Run the image (remember to mount the data!): `docker run -d -p 8000:8000 -v ./server/data:/server/server/data:ro --name easygenedb --env-file .env quoctran98/easygenedb:[arm64/amd64]` (I had the problem with the nested /server/server/ thing, so we're just going to have to live with it for now)


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