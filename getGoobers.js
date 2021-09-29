const { MongoClient } = require("mongodb");
require("dotenv").config();
const Web3 = require("web3");
const R = require("ramda");
const RX = require("rxjs");
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

// long-lived resources
const abi = require(NFT_ABI_PATH);
const web3 = new Web3(ETH_PROVIDER_URL);
const provider = new Web3.providers.HttpProvider(ETH_PROVIDER_URL);
const seaport = new OpenSeaPort(provider, {
  networkName: Network.Main,
});
const opensea = seaport.api;
opensea.pageSize = 50; // max # of assets returnable for each query
const mongo = new MongoClient("mongodb://localhost:27017");
const contract = new web3.eth.Contract(abi, NFT_CONTRACT);

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

const initDB = async ({ dbName }) => {
  await mongo.connect();
  const db = await mongo.db(dbName);
  console.log("Connected successfully to server");
  return db;
};

const writeItems = ({ items, collection }) => {
  const writeCmd = R.map((item) => ({ insertOne: item }), items);
  return collection.bulkWrite(writeCmd);
};

const run = async () => {
  const db = await initDB({ dbName: DB_NAME });
  const collection = db.collection(GOOBERS_COLLECTION);

  console.log(`Writing to '${GOOBERS_COLLECTION}' collection`);

  const nextGoobers = await fetchGoobers({ page: 1000 });
  console.log("Count: ", R.length(nextGoobers));
  //const result = await writeItems({ items: nextGoobers, collection });

  await mongo.close();
};

//run().catch(console.dir);

// simulate network request
//function fetchPage(page = 0) {
//  return timer(1000).pipe(
//    tap(() => console.log(`-> fetched page ${page}`)),
//    mapTo({
//      items: Array.from({ length: 10 }).map((_, i) => page * 10 + i),
//      nextPage: page + 1,
//    })
//  );
//}

const fetchPage = (page = 0) => {};

const getItems = (page) =>
  defer(() => fetchPage(page)).pipe(
    mergeMap(({ items, nextPage }) => {
      const items$ = from(items);
      const next$ = nextPage ? getItems(nextPage) : EMPTY;
      return concat(items$, next$);
    })
  );

// process only first 30 items, without fetching all of the data
//getItems().subscribe((e) => console.log(e));
//.pipe(take(30))

run();
