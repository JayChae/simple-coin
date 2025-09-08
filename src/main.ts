import express from "express";

import {
  generateRawBlock,
  generateBlock,
  generateBlockWithTransaction,
  getAccountBalance,
  getBlockchain,
} from "./blockchain";
import {
  connectToPeer,
  getSockets,
  initP2PServer,
  broadcastLatest,
} from "./p2p";
import { initWallet } from "./wallet";

const httpPort: number = parseInt(process.env.HTTP_PORT || "3001");
const p2pPort: number = parseInt(process.env.P2P_PORT || "6001");
const INITIAL_PEERS = process.env.PEERS ? process.env.PEERS.split(",") : [];

const initHttpServer = (myHttpPort: number) => {
  const app = express();
  app.use(express.json());

  app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
      res.status(400).send(err.message);
    }
  });

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
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

  app.listen(myHttpPort, () => {
    console.log("Listening http on port: " + myHttpPort);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
INITIAL_PEERS.forEach((peer) => connectToPeer(peer));
initWallet();
