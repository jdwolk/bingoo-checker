require("dotenv").config();
const Web3 = require("web3");
const R = require("ramda");
const RX = require("rxjs");
const { OpenSeaPort, Network } = require("opensea-js");

const { ETH_PROVIDER_URL, NFT_CONTRACT, NFT_ABI_PATH } = process.env;

const abi = require(NFT_ABI_PATH);
const web3 = new Web3(ETH_PROVIDER_URL);
const provider = new Web3.providers.HttpProvider(ETH_PROVIDER_URL);
const seaport = new OpenSeaPort(provider, {
  networkName: Network.Main,
});
const opensea = seaport.api;
opensea.pageSize = 50; // max # of assets returnable for each query

const contract = new web3.eth.Contract(abi, NFT_CONTRACT);

const fetchMintData = async () => {
  //console.log(R.drop(10, R.sortBy(R.toLower, R.keys(contract.methods))));

  //const result = await contract.methods.name().call();
  //console.log(result);

  //const result = await web3.eth.getStorageAt(NFT_CONTRACT, 0);
  //console.log(result);

  const { assets } = await opensea.getAssets(
    { asset_contract_address: NFT_CONTRACT },
    1
  );

  const goobers = R.map(
    (goober) => R.merge({ _id: goober.tokenId }, goober),
    assets
  );

  console.log(goobers);
  console.log("Count: ", R.length(goobers));
};

fetchMintData();
