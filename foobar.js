const R = require("ramda");
const parse = require("csv-parse");
const fs = require("fs");

const { withDB } = require("./db");
const INPUT_DIR_SHOULD_BE_READ_FROM_CLI = "./testFiles";
const THIS_SHOULD_BE_READ_FROM_CLI = require(`${INPUT_DIR_SHOULD_BE_READ_FROM_CLI}/bingoo1.json`);

const loadResponses = async ({ file }) => {
  records = [];
  const parser = fs.createReadStream(file).pipe(
    parse({
      columns: (header) =>
        header.map((column) => {
          // TODO: here's where you'd substitute the actual column headers from the
          // google sheet behind the form. Assumes a common question set for all forms
          const mappedColumns = {
            "What is your Discord ID": "discordId",
            "What is your Ethereum Address with the Qualifying Goobers":
              "ethAddress",
            "What are the IDs of your winning Goobers? (separated by spaces)":
              "gooberIds",
          };

          return mappedColumns[column];
        }),
    })
  );

  for await (const record of parser) {
    //TODO: optionally work with each record here
    records.push(record);
  }
  return records;
};

const findWinnerForRow = async ({ row }) => {
  const { responsesCsv, rowType, winningTraits } = row;

  // TODO: allow passing an aribtrary dir from CLI
  const file = `./${INPUT_DIR_SHOULD_BE_READ_FROM_CLI}/${responsesCsv}`;

  const responses = await loadResponses({ file });

  console.log(row);
  console.log(responses);

  return "Joe Schmeagal";
};

const foobar = async ({ config, db }) => {
  const { title, rows } = config;
  console.log(`Finding BINGOO winners for ${title}`);
  const rowPairs = R.toPairs(rows);

  const rawResults = await Promise.all(
    rowPairs.map(async ([rowName, row]) => {
      const rowResult = await findWinnerForRow({ db, row });
      return [rowName, rowResult];
    })
  );

  return R.fromPairs(rawResults);
};

const run = async () => {
  const config = THIS_SHOULD_BE_READ_FROM_CLI;

  withDB(async (db) => {
    const results = await foobar({ config, db });
    console.log(results);
  });
};

module.exports = {
  run,
};
