import elliptic from "elliptic";
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { dirname } from "path";

import {
  getPublicKey,
  getTransactionId,
  signTxIn,
  Transaction,
  TxIn,
  TxOut,
  UnspentTxOut,
} from "./transaction";

const ec = new elliptic.ec("secp256k1");
const privateKeyLocation =
  process.env.PRIVATE_KEY_LOCATION || "node/wallet/private_key";

const getPrivateFromWallet = (): string => {
  const buffer = readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = (): string => {
  const privateKey = getPrivateFromWallet();
  const key = ec.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex", false);
};

const generatePrivateKey = (): string => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const initWallet = () => {
  // let's not override existing private keys
  if (existsSync(privateKeyLocation)) {
    return;
  }

  // Create directory if it doesn't exist
  const dir = dirname(privateKeyLocation);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const newPrivateKey = generatePrivateKey();
  writeFileSync(privateKeyLocation, newPrivateKey);
  console.log("new wallet with private key created at " + privateKeyLocation);
};

const deleteWallet = () => {
  if (existsSync(privateKeyLocation)) {
    unlinkSync(privateKeyLocation);
  }
};

const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number => {
  return findUnspentTxOuts(address, unspentTxOuts).reduce(
    (sum, uTxO) => sum + uTxO.amount,
    0
  );
};

const findUnspentTxOuts = (
  address: string,
  unspentTxOuts: UnspentTxOut[]
): UnspentTxOut[] => {
  return unspentTxOuts.filter((uTxO) => uTxO.address === address);
};

const findTxOutsForAmount = (
  amount: number,
  myUnspentTxOuts: UnspentTxOut[]
) => {
  let currentAmount = 0;
  const includedUnspentTxOuts: UnspentTxOut[] = [];
  for (const myUnspentTxOut of myUnspentTxOuts) {
    includedUnspentTxOuts.push(myUnspentTxOut);
    currentAmount = currentAmount + myUnspentTxOut.amount;
    if (currentAmount >= amount) {
      const leftOverAmount = currentAmount - amount;
      return { includedUnspentTxOuts, leftOverAmount };
    }
  }
  const errorMessage =
    "Cannot create transaction from the available unspent transaction outputs." +
    " Required amount:" +
    amount +
    ". Available unspentTxOuts:" +
    JSON.stringify(myUnspentTxOuts);
  throw Error(errorMessage);
};

const createTxOuts = (
  receiverAddress: string,
  myAddress: string,
  amount: number,
  leftOverAmount: number
) => {
  const txOut1 = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [txOut1];
  } else {
    const leftOverTx = new TxOut(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
  }
};

const filterTxInPoolTxs = (
  unspentTxOuts: UnspentTxOut[],
  mempool: Transaction[]
): UnspentTxOut[] => {
  const txIns: TxIn[] = mempool.flatMap((tx: Transaction) => tx.txIns);

  return unspentTxOuts.filter(
    (unspentTxOut) =>
      !txIns.some(
        (txIn) =>
          txIn.txOutIndex === unspentTxOut.txOutIndex &&
          txIn.txOutId === unspentTxOut.txOutId
      )
  );
};

const createTransaction = (
  receiverAddress: string,
  amount: number,
  privateKey: string,
  unspentTxOuts: UnspentTxOut[],
  txPool: Transaction[]
): Transaction => {
  console.log("txPool: %s", JSON.stringify(txPool));
  const myAddress = getPublicKey(privateKey);
  const myUnspentTxOutsBeforeFiltered = unspentTxOuts.filter(
    (uTxO: UnspentTxOut) => uTxO.address === myAddress
  );

  const myUnspentTxOuts = filterTxInPoolTxs(
    myUnspentTxOutsBeforeFiltered,
    txPool
  );

  const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(
    amount,
    myUnspentTxOuts
  );

  const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
    const txIn = new TxIn(unspentTxOut.txOutId, unspentTxOut.txOutIndex, "");
    return txIn;
  };

  const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

  const tx = new Transaction(
    "",
    unsignedTxIns,
    createTxOuts(receiverAddress, myAddress, amount, leftOverAmount)
  );
  tx.id = getTransactionId(tx);

  tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
    txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
    return txIn;
  });

  return tx;
};

export {
  createTransaction,
  getPublicFromWallet,
  getPrivateFromWallet,
  getBalance,
  generatePrivateKey,
  initWallet,
  deleteWallet,
  findUnspentTxOuts,
};
