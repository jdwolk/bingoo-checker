const { MongoClient } = require("mongodb");
require("dotenv").config();
const Web3 = require("web3");
const R = require("ramda");
const { OpenSeaPort, Network } = require("opensea-js");
const {
  defer,
  timer,
  tap,
  mergeMap,
  mapTo,
  take,
  from,
  concat,
} = require("rxjs");

// constants
const DB_NAME = "goobers_db";
const GOOBERS_COLLECTION = "goobers";
const { ETH_PROVIDER_URL, NFT_CONTRACT, NFT_ABI_PATH } = process.env;
const SLEEP_SECONDS = 1;
const GOOBERS_PER_PAGE = 50;

// long-lived resources
const abi = require(NFT_ABI_PATH);
const web3 = new Web3(ETH_PROVIDER_URL);
const provider = new Web3.providers.HttpProvider(ETH_PROVIDER_URL);
const seaport = new OpenSeaPort(provider, {
  networkName: Network.Main,
});
const opensea = seaport.api;
opensea.pageSize = GOOBERS_PER_PAGE; // max # of assets returnable for each query
const mongo = new MongoClient("mongodb://localhost:27017");
const contract = new web3.eth.Contract(abi, NFT_CONTRACT);

const initDB = async ({ dbName }) => {
  await mongo.connect();
  const db = await mongo.db(dbName);
  console.log("DB initialized");
  return db;
};

const writeItems = ({ items, dbCollection }) => {
  const writeCmd = R.map(
    (item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: item },
        upsert: true,
      },
    }),
    items
  );
  return dbCollection.bulkWrite(writeCmd);
};

const wait = (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const makeRange = ({ page, perPage }) => {
  const end = page * perPage;
  const start = end - perPage;
  return { start, end };
};

const fetchGoobers = async ({ page }) => {
  const { assets } = await opensea.getAssets(
    { asset_contract_address: NFT_CONTRACT },
    page
  );

  const goobers = R.map(
    (goober) => R.merge({ _id: goober.tokenId }, goober),
    assets
  );

  return goobers;
};

const getNextGoobers = async ({ page, dbCollection }) => {
  const { start, end } = makeRange({ page, perPage: GOOBERS_PER_PAGE });
  console.log(`Adding goobers ${start}-${end}`);
  const nextGoobers = await fetchGoobers({ page });
  writeItems({ items: nextGoobers, dbCollection });
  await wait(SLEEP_SECONDS);
};

const run = async () => {
  const db = await initDB({ dbName: DB_NAME });
  const dbCollection = db.collection(GOOBERS_COLLECTION);

  console.log(`Writing to '${GOOBERS_COLLECTION}' collection`);

  let page = 1;
  while (true) {
    try {
      await getNextGoobers({ page, dbCollection });
      page++;
    } catch (e) {
      console.error(e);
      break;
    }
  }
  console.log("Done!");
  await mongo.close();
};

module.exports = {
  run,
};
