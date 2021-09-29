require("dotenv").config();
const Web3 = require("web3");
const R = require("ramda");
const { OpenSeaPort, Network } = require("opensea-js");

const { withDB, DB_COLLECTIONS } = require('./db');

// constants
const { ETH_PROVIDER_URL, NFT_CONTRACT } = process.env;
const SLEEP_SECONDS = 1;
const GOOBERS_PER_PAGE = 50;
const MAX_GOOBERS = 10000;

// long-lived resources
const provider = new Web3.providers.HttpProvider(ETH_PROVIDER_URL);
const seaport = new OpenSeaPort(provider, {
  networkName: Network.Main,
});

const opensea = seaport.api;
opensea.pageSize = GOOBERS_PER_PAGE; // max # of assets returnable for each query

//const abi = require(NFT_ABI_PATH);
//const web3 = new Web3(ETH_PROVIDER_URL);
//const contract = new web3.eth.Contract(abi, NFT_CONTRACT);

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

  if (writeCmd.length === 0) {
    return Promise.resolve();
  }
  return dbCollection.bulkWrite(writeCmd);
};

const writeGoobersByOwner = async ({ db, goobers }) => {
  const owners = db.collection(DB_COLLECTIONS.owners);

  const goobersByOwner = await R.reduce(
    async (ownersHashPromise, goober) => {
      const ownersHash = await ownersHashPromise;
      const ownerAddress = goober.owner.address;
      const existingOwner = await owners.findOne({ _id: ownerAddress });

      const maybeNonUniqueGoobers = [
        ...(existingOwner?.goobers || []),
        ...(ownersHash[ownerAddress] || []),
        ...[goober],
      ];

      const goobers = R.uniqBy(R.prop("_id"), maybeNonUniqueGoobers);

      return {
        ...ownersHash,
        ...{
          [ownerAddress]: goobers,
        },
      };
    },
    {},
    goobers
  );

  const ownersAndGoobers = R.map(
    (ownerHash) => ({
      _id: ownerHash,
      owner: ownerHash,
      goobers: goobersByOwner[ownerHash],
    }),
    R.keys(goobersByOwner)
  );

  return writeItems({ items: ownersAndGoobers, dbCollection: owners });
};

const writeGoobers = async ({ goobers, db, page }) => {
  const dbCollection = db.collection(DB_COLLECTIONS.goobers);
  return await writeItems({ items: goobers, dbCollection });
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

const writeNextGoobers = async ({ page, db }) => {
  const nextGoobers = await fetchGoobers({ page });

  await writeGoobers({ goobers: nextGoobers, db, page });
  await writeGoobersByOwner({ goobers: nextGoobers, db });
  await wait(SLEEP_SECONDS);
};

const getGoobers = async ({ db }) => {
  let page = 1;
  while (true) {
    try {
      const { start, end } = makeRange({ page, perPage: GOOBERS_PER_PAGE });
      if (start >= MAX_GOOBERS) { break }

      console.log(`Adding goobers ${start}-${end}`);
      await writeNextGoobers({ page, db });
      page++;
    } catch (e) {
      console.error(e);
      break;
    }
  }
  console.log("Done getting goobers");
};

const run = () => {
  withDB(async (db) => {
    await getGoobers({ db });
  });
};

module.exports = {
  run,
};
