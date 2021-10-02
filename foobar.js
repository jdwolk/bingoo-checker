const R = require("ramda");
const parse = require("csv-parse");
const fs = require("fs");

const { withDB } = require("./db");
const Regular = require("./regularBingooRules");
const Mini = require("./miniBingooRules");
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

const checkResponse = ({ rowType, ...rest }) => {
  return rowType === "regular" ? Regular.check(rest) : Mini.check(rest);
};

const findWinnerForRow = async ({ db, row }) => {
  const { responsesCsv, rowType, winningTraits } = row;

  // TODO: allow passing an aribtrary dir from CLI
  const file = `./${INPUT_DIR_SHOULD_BE_READ_FROM_CLI}/${responsesCsv}`;

  const responses = await loadResponses({ file });

  return R.reduce(
    async (winnersPromise, response) => {
      const winners = await winnersPromise;
      const newWinner = await checkResponse({
        db,
        response,
        rowType,
        winningTraits,
        winners,
      });
      console.log("new winner: ", newWinner);
      return {
        ...winners,
        ...(newWinner || {}),
      };
    },
    {},
    responses
  );
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
    console.log("Results: ", results);
  });
};

module.exports = {
  run,
};
