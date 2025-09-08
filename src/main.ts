import express from "express";

import {
  generateRawBlock,
  generateBlock,
  generateBlockWithTransaction,
  getAccountBalance,
  getBlockchain,
  getUnspentTxOuts,
  getMyUnspentTransactionOutputs,
  sendTransaction,
} from "./blockchain";
import {
  connectToPeer,
  getSockets,
  initP2PServer,
  broadcastLatest,
  broadcastMempool,
} from "./p2p";
import { getPublicFromWallet, initWallet } from "./wallet";
import { getMempool } from "./mempool";
import path from "path";

const httpPort: number = parseInt(process.env.HTTP_PORT || "3001");
const p2pPort: number = parseInt(process.env.P2P_PORT || "6001");
const INITIAL_PEERS = process.env.PEERS ? process.env.PEERS.split(",") : [];

const initHttpServer = (myHttpPort: number) => {
  const app = express();
  app.use(express.json());

  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
      res.status(400).send(err.message);
    }
  });

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });

  app.get("/block/hash/:hash", (req, res) => {
    const block = getBlockchain().find(
      (block) => block.hash === req.params.hash
    );
    res.send(block);
  });
  app.get("/block/index/:index", (req, res) => {
    const block = getBlockchain().find(
      (block) => block.index === Number(req.params.index)
    );
    res.send(block);
  });

  app.get("/transaction/:id", (req, res) => {
    const tx = getBlockchain()
      .flatMap((block) => block.data)
      .find((transaction) => transaction.id === req.params.id);
    res.send(tx);
  });

  app.get("/address/:address", (req, res) => {
    const unspentTxOuts = getUnspentTxOuts().filter(
      (uTxO) => uTxO.address === req.params.address
    );
    res.send({ unspentTxOuts: unspentTxOuts });
  });

  app.get("/unspentTransactionOutputs", (req, res) => {
    res.send(getUnspentTxOuts());
  });

  app.get("/myUnspentTransactionOutputs", (req, res) => {
    res.send(getMyUnspentTransactionOutputs());
  });

  app.post("/mineRawBlock", (req, res) => {
    if (req.body.data == null) {
      res.send("data parameter is missing");
      return;
    }
    const newBlock = generateRawBlock(req.body.data);
    if (newBlock === null) {
      res.status(400).send("could not generate block");
    } else {
      broadcastLatest();
      res.send(newBlock);
    }
  });

  app.post("/mineBlock", (req, res) => {
    const newBlock = generateBlock();
    if (newBlock === null) {
      res.status(400).send("could not generate block");
    } else {
      broadcastLatest();
      res.send(newBlock);
    }
  });

  app.get("/balance", (req, res) => {
    const balance: number = getAccountBalance();
    res.send({ balance: balance });
  });

  app.get("/address", (req, res) => {
    const address: string = getPublicFromWallet();
    res.send({ address: address });
  });

  app.post("/mineTransaction", (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    try {
      const newBlock = generateBlockWithTransaction(address, amount);
      if (newBlock === null) {
        res.status(400).send("could not generate block");
      } else {
        broadcastLatest();
        res.send(newBlock);
      }
    } catch (e) {
      if (e instanceof Error) {
        res.status(400).send(e.message);
      } else {
        res.status(400).send("unknown error");
      }
    }
  });

  app.post("/sendTransaction", (req, res) => {
    try {
      const address = req.body.address;
      const amount = req.body.amount;

      if (address === undefined || amount === undefined) {
        throw Error("invalid address or amount");
      }
      const tx = sendTransaction(address, amount);
      broadcastMempool();
      res.send(tx);
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.message);
        res.status(400).send(e.message);
      } else {
        console.log(e);
        res.status(400).send("unknown error");
      }
    }
  });

  app.get("/mempool", (req, res) => {
    res.send(getMempool());
  });

  app.get("/peers", (req, res) => {
    res.send(
      getSockets().map(
        (s: any) => s._socket.remoteAddress + ":" + s._socket.remotePort
      )
    );
  });
  app.post("/addPeer", (req, res) => {
    connectToPeer(req.body.peer);
    res.send();
  });

  app.post("/stop", (req, res) => {
    res.send({ msg: "stopping server" });
    process.exit();
  });

  // Catch-all handler for SPA routing - handle specific routes
  app.get("/explorer", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  app.get("/wallet", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });


  app.use((req, res) => {
    if (req.method === "GET") {
      res.sendFile(path.join(__dirname, "..", "public", "index.html"));
    } else {
      res.status(404).send("Not Found");
    }
  });

  app.listen(myHttpPort, () => {
    console.log("Listening http on port: " + myHttpPort);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
INITIAL_PEERS.forEach((peer) => connectToPeer(peer));
initWallet();
