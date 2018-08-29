# Nomis BatchLoader

# Get Started

1. Install the dependencies required to run the service:

  ```
  $ yarn
  ```  
2. Supply environment variables. The required environment variables are defined in server/config.js.


3. Start the server

  ```   
  $ yarn run start
  ```

   Or, for development, run inspections, tests, watch for changes and start the server:
   
  ```   
  $ yarn run dev
  ```
  
4. Visit [localhost:3001](http://localhost:3001/) (depending on what PORT you have chosen)

## Developer Commands

 - `yarn run lint` -> style checks using eslint
 - `yarn run test` -> runs all unit tests
 - `yarn run clean` -> cleans previously generated files
 - `yarn run build` -> cleans and regenerates assets.
 

# Environment variables

The following environment variables are used and values should be supplied

* PORT - eg 3001
* NOMIS_API_URL - url for nomis elite2 api entry point eg http://localhost:9090/elite2api
* NOMIS_GW_TOKEN - MoJ dev token for nomis elite2 access
* NOMIS_GW_KEY - Base64 encoded private key corresponding to the public key used when generating the NOMIS_GW_TOKEN
* BATCH_USER_ROLE - Role name allowing access to the batchload UI, eg NOMIS_BATCHLOAD

For the database:
* DB_USER - username for DB access
* DB_PASS - password for DB access
* DB_SERVER - DB server host
* DB_NAME - DB name

## Migrations

Migrations are managed using [knex](http://knexjs.org/#Migrations-CLI) and [knex-migrate](https://github.com/sheerun/knex-migrate)

Execute migration

```
yarn migrate
```

Other migration commands

```
yarn run knex-migrate <command>
```

Commands
* pending   Lists all pending migrations
* list      Lists all executed migrations
* up        Performs all pending migrations
* down      Rollbacks last migration
* rollback  Rollbacks last batch of migrations
* redo      Rollbacks last batch and performs all migrations

Create a new migration script

```
yarn run knex migrate:make <script-name>
```

## Seed data

Execute seed scripts to populate DB with test data

```
yarn seed
```

Create a new seed file

```
yarn run knex seed:make <script-name>
```

## Local database set up

```
CREATE DATABASE nomisbatch CONTAINMENT = PARTIAL
``` 


# Delius Extract CSV Format

There are some sample CSV files in src/test/resources. In server/config.js there is a csv columns config object
that specifies the column names that will be consumed from the CSV. Other columsn will be ignored.

eg

    ```
    csv: {
        columns: {
            offenderNomis: 'NOMS No',
            offenderPnc: 'PNC No',
            staffId: 'Staff Cd (OfM)',
            staffFirst: 'Staff First',
            staffLast: 'Staff Last'
        },
        delimiter: ','
    }
    ```

would work for a CSV file such as

```
Active Offender Y/N,In Custody Y/N,CRN,PNC No,NOMS No,Staff Cd (OfM), Staff First, Staff Last
Y,Y,S663770,1987/0081140U,A8360CL,ALLUATU,first,last
Y,Y,E035316,2009/0435434J,A7352DW,ASPC111,first,last
Y,Y,T021020,1995/0118995M,A2436AP,ASPC111,first,last

```    
where the columns Active Offender Y/N, In Custody Y/N, and CRN would all be ignored, or alternately

```
PNC No,NOMS No,Staff Cd (OfM), Staff First, Staff Last
1987/0081140U,A8360CL,ALLUATU,first,last
2009/0435434J,A7352DW,ASPC111,first,last
1995/0118995M,A2436AP,ASPC111,first,last

```    

TODO NB Don't know if we get staff names from Delius or if this was a leftover from early guesses.
