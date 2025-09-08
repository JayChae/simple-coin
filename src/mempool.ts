import {
  Transaction,
  TxIn,
  UnspentTxOut,
  validateTransaction,
} from "./transaction";

let mempool: Transaction[] = [];

const getMempool = () => {
  return structuredClone(mempool);
};

const addToMempool = (tx: Transaction, unspentTxOuts: UnspentTxOut[]) => {
  if (!validateTransaction(tx, unspentTxOuts)) {
    throw Error("Error: Trying to add invalid tx to pool");
  }

  if (!isValidTxForMempool(tx, mempool)) {
    throw Error("Error: Trying to add invalid tx to pool");
  }
  console.log("adding to mempool: %s", JSON.stringify(tx));
  mempool.push(tx);
};

const hasTxInUnspentTxOuts = (
  txIn: TxIn,
  unspentTxOuts: UnspentTxOut[]
): boolean =>
  unspentTxOuts.some(
    (uTxO) =>
      uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
  );

const updateMempool = (unspentTxOuts: UnspentTxOut[]) => {
  const validTxs = mempool.filter((tx) =>
    tx.txIns.every((txIn) => hasTxInUnspentTxOuts(txIn, unspentTxOuts))
  );

  if (validTxs.length < mempool.length) {
    const validTxSet = new Set(validTxs);
    const invalidTxs = mempool.filter((tx) => !validTxSet.has(tx));
    console.log(
      "removing the following transactions from mempool: %s",
      JSON.stringify(invalidTxs)
    );
    mempool = validTxs;
  }
};

const getTxPoolIns = (aMempool: Transaction[]): TxIn[] =>
  aMempool.flatMap((tx) => tx.txIns);

const isValidTxForMempool = (
  tx: Transaction,
  aMempool: Transaction[]
): boolean => {
  const txPoolIns: TxIn[] = getTxPoolIns(aMempool);

  for (const txIn of tx.txIns) {
    if (
      txPoolIns.some(
        (poolIn) =>
          txIn.txOutId === poolIn.txOutId &&
          txIn.txOutIndex === poolIn.txOutIndex
      )
    ) {
      console.log("txIn already found in the txPool");
      return false;
    }
  }
  return true;
};

export { addToMempool, getMempool, updateMempool };
