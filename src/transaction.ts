import sha256 from "crypto-js/sha256";
import elliptic from "elliptic";

const ec = new elliptic.ec("secp256k1");

const COINBASE_AMOUNT: number = 50;

class UnspentTxOut {
  public readonly txOutId: string;
  public readonly txOutIndex: number;
  public readonly address: string;
  public readonly amount: number;

  constructor(
    txOutId: string,
    txOutIndex: number,
    address: string,
    amount: number
  ) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

class TxIn {
  public txOutId: string;
  public txOutIndex: number;
  public signature: string;

  constructor(txOutId: string, txOutIndex: number, signature: string) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.signature = signature;
  }
}

class TxOut {
  public address: string;
  public amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
  public id: string;
  public txIns: TxIn[];
  public txOuts: TxOut[];

  constructor(id: string, txIns: TxIn[], txOuts: TxOut[]) {
    this.id = id;
    this.txIns = txIns;
    this.txOuts = txOuts;
  }
}

const getTransactionId = (transaction: Transaction): string => {
  const txInContent: string = transaction.txIns
    .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
    .join("");

  const txOutContent: string = transaction.txOuts
    .map((txOut: TxOut) => txOut.address + txOut.amount)
    .join("");

  return sha256(txInContent + txOutContent).toString();
};

const validateTransaction = (
  transaction: Transaction,
  aUnspentTxOuts: UnspentTxOut[]
): boolean => {
  if (getTransactionId(transaction) !== transaction.id) {
    console.log("invalid tx id: " + transaction.id);
    return false;
  }
  const hasValidTxIns: boolean = transaction.txIns.every((txIn) =>
    validateTxIn(txIn, transaction, aUnspentTxOuts)
  );

  if (!hasValidTxIns) {
    console.log("some of the txIns are invalid in tx: " + transaction.id);
    return false;
  }

  const totalTxInValues: number = transaction.txIns
    .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
    .reduce((a, b) => a + b, 0);

  const totalTxOutValues: number = transaction.txOuts
    .map((txOut) => txOut.amount)
    .reduce((a, b) => a + b, 0);

  if (totalTxOutValues !== totalTxInValues) {
    console.log(
      "totalTxOutValues !== totalTxInValues in tx: " + transaction.id
    );
    return false;
  }

  return true;
};

const validateBlockTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
): boolean => {
  const coinbaseTx = aTransactions[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
    console.log("invalid coinbase transaction: " + JSON.stringify(coinbaseTx));
    return false;
  }

  //check for duplicate txIns. Each txIn can be included only once
  const txIns: TxIn[] = aTransactions.flatMap((tx) => tx.txIns);

  if (hasDuplicates(txIns)) {
    return false;
  }

  // all but coinbase transactions
  const normalTransactions: Transaction[] = aTransactions.slice(1);
  return normalTransactions.every((tx) =>
    validateTransaction(tx, aUnspentTxOuts)
  );
};

const hasDuplicates = (txIns: TxIn[]): boolean => {
  const seen = new Set<string>();

  for (const txIn of txIns) {
    const key = txIn.txOutId + txIn.txOutIndex;
    if (seen.has(key)) {
      console.log("duplicate txIn: " + key);
      return true;
    }
    seen.add(key);
  }

  return false;
};

const validateCoinbaseTx = (
  transaction: Transaction,
  blockIndex: number
): boolean => {
  if (transaction == null) {
    console.log(
      "the first transaction in the block must be coinbase transaction"
    );
    return false;
  }
  if (getTransactionId(transaction) !== transaction.id) {
    console.log("invalid coinbase tx id: " + transaction.id);
    return false;
  }
  if (transaction.txIns.length !== 1) {
    console.log("one txIn must be specified in the coinbase transaction");
    return false;
  }
  if (transaction.txIns[0].txOutIndex !== blockIndex) {
    console.log("the txIn signature in coinbase tx must be the block height");
    return false;
  }
  if (transaction.txOuts.length !== 1) {
    console.log("invalid number of txOuts in coinbase transaction");
    return false;
  }
  if (transaction.txOuts[0].amount != COINBASE_AMOUNT) {
    console.log("invalid coinbase amount in coinbase transaction");
    return false;
  }
  return true;
};

const validateTxIn = (
  txIn: TxIn,
  transaction: Transaction,
  aUnspentTxOuts: UnspentTxOut[]
): boolean => {
  const referencedUTxOut = aUnspentTxOuts.find(
    (uTxO) =>
      uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
  );
  if (!referencedUTxOut) {
    console.log("referenced txOut not found: " + JSON.stringify(txIn));
    return false;
  }
  const address = referencedUTxOut.address;

  const key = ec.keyFromPublic(address, "hex");
  return key.verify(transaction.id, txIn.signature);
};

const getTxInAmount = (txIn: TxIn, aUnspentTxOuts: UnspentTxOut[]): number => {
  return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
};

const findUnspentTxOut = (
  transactionId: string,
  index: number,
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut => {
  const unspentTxOut = aUnspentTxOuts.find(
    (uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index
  );
  if (!unspentTxOut) {
    throw new Error("UnspentTxOut not found");
  }
  return unspentTxOut;
};

const getCoinbaseTransaction = (
  address: string,
  blockIndex: number
): Transaction => {
  const txIn: TxIn = new TxIn("", blockIndex, "");
  const t = new Transaction("", [txIn], [new TxOut(address, COINBASE_AMOUNT)]);
  t.id = getTransactionId(t);
  return t;
};

const signTxIn = (
  transaction: Transaction,
  txInIndex: number,
  privateKey: string,
  aUnspentTxOuts: UnspentTxOut[]
): string => {
  const txIn: TxIn = transaction.txIns[txInIndex];

  const dataToSign = transaction.id;
  const referencedUnspentTxOut: UnspentTxOut = findUnspentTxOut(
    txIn.txOutId,
    txIn.txOutIndex,
    aUnspentTxOuts
  );

  const referencedAddress = referencedUnspentTxOut.address;

  if (getPublicKey(privateKey) !== referencedAddress) {
    console.log(
      "trying to sign an input with private key" +
        "that does not match the address that is referenced in txIn"
    );
    throw Error();
  }
  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature: string = byteArrayToHexString(key.sign(dataToSign).toDER());

  return signature;
};

const updateUnspentTxOuts = (
  newTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut[] => {
  const newUnspentTxOuts: UnspentTxOut[] = newTransactions.flatMap((t) =>
    t.txOuts.map(
      (txOut, index) =>
        new UnspentTxOut(t.id, index, txOut.address, txOut.amount)
    )
  );

  const consumedTxOuts: UnspentTxOut[] = newTransactions.flatMap((t) =>
    t.txIns.map(
      (txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, "", 0)
    )
  );

  const resultingUnspentTxOuts = [
    ...aUnspentTxOuts.filter(
      (uTxO) =>
        !consumedTxOuts.some(
          (consumedTxOut) =>
            consumedTxOut.txOutId === uTxO.txOutId &&
            consumedTxOut.txOutIndex === uTxO.txOutIndex
        )
    ),
    ...newUnspentTxOuts,
  ];

  return resultingUnspentTxOuts;
};

const processTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
) => {
  if (!isValidTransactionsStructure(aTransactions)) {
    return null;
  }

  if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
    console.log("invalid block transactions");
    return null;
  }
  return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};

const byteArrayToHexString = (byteArray: number[]): string => {
  return Array.from(byteArray, (byte: number) => {
    return byte.toString(16).padStart(2, "0");
  }).join("");
};

const getPublicKey = (aPrivateKey: string): string => {
  return ec.keyFromPrivate(aPrivateKey, "hex").getPublic().encode("hex", false);
};

const isValidTxInStructure = (txIn: TxIn): boolean => {
  if (txIn == null) {
    console.log("txIn is null");
    return false;
  } else if (typeof txIn.signature !== "string") {
    console.log("invalid signature type in txIn");
    return false;
  } else if (typeof txIn.txOutId !== "string") {
    console.log("invalid txOutId type in txIn");
    return false;
  } else if (typeof txIn.txOutIndex !== "number") {
    console.log("invalid txOutIndex type in txIn");
    return false;
  } else {
    return true;
  }
};

const isValidTxOutStructure = (txOut: TxOut): boolean => {
  if (txOut == null) {
    console.log("txOut is null");
    return false;
  } else if (typeof txOut.address !== "string") {
    console.log("invalid address type in txOut");
    return false;
  } else if (!isValidAddress(txOut.address)) {
    console.log("invalid TxOut address");
    return false;
  } else if (typeof txOut.amount !== "number") {
    console.log("invalid amount type in txOut");
    return false;
  } else {
    return true;
  }
};

const isValidTransactionsStructure = (transactions: Transaction[]): boolean =>
  transactions.every(isValidTransactionStructure);

const isValidTransactionStructure = (transaction: Transaction): boolean => {
  if (typeof transaction.id !== "string") {
    console.log("transactionId missing");
    return false;
  }
  if (!(transaction.txIns instanceof Array)) {
    console.log("invalid txIns type in transaction");
    return false;
  }
  if (!transaction.txIns.every(isValidTxInStructure)) {
    return false;
  }

  if (!(transaction.txOuts instanceof Array)) {
    console.log("invalid txIns type in transaction");
    return false;
  }

  if (!transaction.txOuts.every(isValidTxOutStructure)) {
    return false;
  }
  return true;
};

//valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const isValidAddress = (address: string): boolean => {
  if (address.length !== 130) {
    console.log("invalid public key length");
    return false;
  }

  if (!/^[a-fA-F0-9]+$/.test(address)) {
    console.log("public key must contain only hex characters");
    return false;
  }

  if (!address.startsWith("04")) {
    console.log("public key must start with 04");
    return false;
  }

  return true;
};

export {
  processTransactions,
  signTxIn,
  getTransactionId,
  UnspentTxOut,
  TxIn,
  TxOut,
  getCoinbaseTransaction,
  getPublicKey,
  Transaction,
  isValidTransactionStructure,
  isValidAddress,
};
