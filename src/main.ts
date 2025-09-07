import express from "express";

import { Block, generateNextBlock, getBlockchain } from "./blockchain";
import {
  connectToPeer,
  getSockets,
  initP2PServer,
  broadcastLatest,
} from "./p2p";

const httpPort: number = parseInt(process.env.HTTP_PORT || "3001");
const p2pPort: number = parseInt(process.env.P2P_PORT || "6001");
const INITIAL_PEERS = process.env.PEERS ? process.env.PEERS.split(",") : [];

const initHttpServer = (myHttpPort: number) => {
  const app = express();
  app.use(express.json());

  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });
  app.post("/mineBlock", (req, res) => {
    const newBlock: Block = generateNextBlock(req.body.data);
    broadcastLatest();
    res.send(newBlock);
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
