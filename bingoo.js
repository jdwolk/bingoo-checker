require("dotenv").config();
const Web3 = require("web3");

const { ETH_PROVIDER_URL, NFT_CONTRACT, NFT_ABI_PATH } = process.env;

const abi = require(NFT_ABI_PATH);
const web3 = new Web3(ETH_PROVIDER_URL);
const contract = new web3.eth.Contract(abi, NFT_CONTRACT);

const fetchMintData = async () => {
  const maxSupplyFn = contract.methods.MAX_SUPPLY || contract.methods.maxSupply;
  const maxSupply = await maxSupplyFn().call();
  const numMinted = await contract.methods.totalSupply().call();
  const percent = Math.round((numMinted / maxSupply) * 100);
  const result = {
    maxSupply,
    numMinted,
    percent,
  };
  console.log(result);
};

fetchMintData();
