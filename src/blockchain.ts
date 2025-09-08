import sha256 from "crypto-js/sha256";
import { hexToBinary } from "./util";
import {
  getCoinbaseTransaction,
  isValidAddress,
  processTransactions,
  Transaction,
  UnspentTxOut,
} from "./transaction";
import {
  createTransaction,
  getBalance,
  getPrivateFromWallet,
  getPublicFromWallet,
} from "./wallet";

class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public data: Transaction[];
  public difficulty: number;
  public nonce: number;

  constructor(
    index: number,
    previousHash: string,
    timestamp: number,
    data: Transaction[],
    difficulty: number,
    nonce: number,
    hash: string
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
    this.hash = hash;
  }
}

const genesisBlock: Block = new Block(
  0,
  "",
  1756716811,
  [],
  0,
  0,
  "38cdd2a4bdf21856e32e440da4ade0441e5b327f87981fe18dc63c4e1f0a2db6"
);

let blockchain: Block[] = [genesisBlock];

let unspentTxOuts: UnspentTxOut[] = [];

const getBlockchain = (): Block[] => blockchain;

const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

const getDifficulty = (aBlockchain: Block[]): number => {
  const latestBlock: Block = aBlockchain[blockchain.length - 1];
  if (
    latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    latestBlock.index !== 0
  ) {
    return getAdjustedDifficulty(latestBlock, aBlockchain);
  } else {
    return latestBlock.difficulty;
  }
};

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
  const prevAdjustmentBlock: Block =
    aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected: number =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken: number =
    latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
};

const getCurrentTimestamp = (): number =>
  Math.round(new Date().getTime() / 1000);

const generateRawBlock = (blockData: Transaction[]) => {
  const previousBlock: Block = getLatestBlock();
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = new Date().getTime() / 1000;
  const difficulty: number = getDifficulty(getBlockchain());

  const newBlock: Block = findBlock(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData,
    difficulty
  );
  const isAdded = addBlockToChain(newBlock);
  if (isAdded) {
    return newBlock;
  } else {
    return null;
  }
};

const generateBlock = () => {
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const blockData: Transaction[] = [coinbaseTx];
  return generateRawBlock(blockData);
};

const generateBlockWithTransaction = (
  receiverAddress: string,
  amount: number
) => {
  if (!isValidAddress(receiverAddress)) {
    throw Error("invalid address");
  }
  if (typeof amount !== "number") {
    throw Error("invalid amount");
  }
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const tx: Transaction = createTransaction(
    receiverAddress,
    amount,
    getPrivateFromWallet(),
    unspentTxOuts
  );
  const blockData: Transaction[] = [coinbaseTx, tx];
  return generateRawBlock(blockData);
};

const findBlock = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number
): Block => {
  let nonce = 0;
  while (true) {
    const hash: string = calculateHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(
        index,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce,
        hash
      );
    }
    nonce++;
  }
};

const getAccountBalance = (): number => {
  return getBalance(getPublicFromWallet(), unspentTxOuts);
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
  const hashInBinary: string = hexToBinary(hash) || "";
  const requiredPrefix: string = "0".repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
};

const calculateHashForBlock = (block: Block): string =>
  calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce
  );

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number,
  nonce: number
): string =>
  sha256(
    index + previousHash + timestamp + data + difficulty + nonce
  ).toString();

const isValidBlockStructure = (block: Block): boolean => {
  return (
    typeof block.index === "number" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "object" &&
    typeof block.hash === "string"
  );
};

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
  if (!isValidBlockStructure(newBlock)) {
    console.log("invalid structure");
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("invalid index");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log("invalid previoushash");
    return false;
  } else if (!isValidTimestamp(newBlock, previousBlock)) {
    console.log("invalid timestamp");
    return false;
  } else if (!hasValidHash(newBlock)) {
    return false;
  }
  return true;
};

const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
  return (
    previousBlock.timestamp - 60 < newBlock.timestamp &&
    newBlock.timestamp - 60 < getCurrentTimestamp()
  );
};

const hasValidHash = (block: Block): boolean => {
  if (!hashMatchesBlockContent(block)) {
    console.log("invalid hash, got:" + block.hash);
    return false;
  }

  if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
    console.log(
      "block difficulty not satisfied. Expected: " +
        block.difficulty +
        "got: " +
        block.hash
    );
  }
  return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
  const blockHash: string = calculateHashForBlock(block);
  return blockHash === block.hash;
};

const isValidGenesis = (block: Block): boolean => {
  return JSON.stringify(block) === JSON.stringify(genesisBlock);
};

const isValidChain = (blockchainToValidate: Block[]): boolean => {
  if (!isValidGenesis(blockchainToValidate[0])) {
    return false;
  }

  for (let i = 1; i < blockchainToValidate.length; i++) {
    if (
      !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])
    ) {
      return false;
    }
  }
  return true;
};

const addBlockToChain = (newBlock: Block): boolean => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    const newUnspentTxOuts = processTransactions(
      newBlock.data,
      unspentTxOuts,
      newBlock.index
    );
    if (newUnspentTxOuts === null) {
      return false;
    } else {
      blockchain.push(newBlock);
      unspentTxOuts = newUnspentTxOuts;
      return true;
    }
  }
  return false;
};

const replaceChain = (newBlockchain: Block[]) => {
  if (
    isValidChain(newBlockchain) &&
    getAccumulatedDifficulty(newBlockchain) >
      getAccumulatedDifficulty(getBlockchain())
  ) {
    console.log(
      "Received blockchain is valid. Replacing current blockchain with received blockchain"
    );
    blockchain = newBlockchain;
  } else {
    console.log("Received blockchain invalid");
  }
};

const getAccumulatedDifficulty = (aBlockchain: Block[]): number =>
  aBlockchain.reduce((sum, block) => sum + 2 ** block.difficulty, 0);

export {
  Block,
  getBlockchain,
  getLatestBlock,
  generateRawBlock,
  isValidBlockStructure,
  replaceChain,
  addBlockToChain,
  generateBlock,
  generateBlockWithTransaction,
  getAccountBalance,
};
