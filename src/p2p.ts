import WebSocket from "ws";

import {
  addBlockToChain,
  Block,
  getBlockchain,
  getLatestBlock,
  isValidBlockStructure,
  replaceChain,
  handleReceivedTransaction,
} from "./blockchain";

import { Transaction } from "./transaction";
import { getMempool } from "./mempool";

const sockets: WebSocket[] = [];

enum MessageType {
  QUERY_LATEST = 0,
  QUERY_ALL = 1,
  RESPONSE_BLOCKCHAIN = 2,
  QUERY_MEMPOOL = 3,
  RESPONSE_MEMPOOL = 4,
}

interface Message {
  type: MessageType;
  data: any;
}

const initP2PServer = (p2pPort: number) => {
  const server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws: WebSocket) => {
    initConnection(ws);
    console.log("connected", ws);
  });
  console.log("listening websocket p2p port on: " + p2pPort);
};

const getSockets = () => sockets;

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  sendMessage(ws, queryChainLengthMsg());

  // query mempool only some time after chain query
  setTimeout(() => {
    broadcast(queryMempoolMsg());
  }, 500);
};

const JSONToObject = <T>(data: string): T | null => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

const initMessageHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    try {
      const message: Message | null = JSONToObject<Message>(data);
      if (message === null) {
        console.log("could not parse received JSON message: " + data);
        return;
      }
      console.log("Received message" + JSON.stringify(message));
      switch (message.type) {
        case MessageType.QUERY_LATEST:
          sendMessage(ws, responseLatestMsg());
          break;
        case MessageType.QUERY_ALL:
          sendMessage(ws, responseChainMsg());
          break;
        case MessageType.RESPONSE_BLOCKCHAIN:
          const receivedBlocks: Block[] | null = JSONToObject<Block[]>(
            message.data
          );
          if (receivedBlocks === null) {
            console.log("invalid blocks received:");
            console.log(message.data);
            break;
          }
          handleBlockchainResponse(receivedBlocks);
          break;
        case MessageType.QUERY_MEMPOOL:
          sendMessage(ws, responseMempoolMsg());
          break;
        case MessageType.RESPONSE_MEMPOOL:
          const receivedTransactions: Transaction[] | null = JSONToObject<
            Transaction[]
          >(message.data);
          if (receivedTransactions === null) {
            console.log(
              "invalid transaction received: %s",
              JSON.stringify(message.data)
            );
            break;
          }
          receivedTransactions.forEach((transaction: Transaction) => {
            try {
              handleReceivedTransaction(transaction);
              broadcastMempool();
            } catch (e) {
              if (e instanceof Error) {
                console.log(e.message);
              } else {
                console.log(e);
              }
            }
          });
          break;
      }
    } catch (e) {
      console.log(e);
      return;
    }
  });
};

const sendMessage = (ws: WebSocket, message: Message): void =>
  ws.send(JSON.stringify(message));

const broadcast = (message: Message): void =>
  sockets.forEach((socket) => sendMessage(socket, message));

const queryChainLengthMsg = (): Message => ({
  type: MessageType.QUERY_LATEST,
  data: null,
});

const queryAllMsg = (): Message => ({
  type: MessageType.QUERY_ALL,
  data: null,
});

const responseChainMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(getBlockchain()),
});

const responseLatestMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([getLatestBlock()]),
});

const queryMempoolMsg = (): Message => ({
  type: MessageType.QUERY_MEMPOOL,
  data: null,
});

const responseMempoolMsg = (): Message => ({
  type: MessageType.RESPONSE_MEMPOOL,
  data: JSON.stringify(getMempool()),
});

const initErrorHandler = (ws: WebSocket) => {
  const closeConnection = (myWs: WebSocket) => {
    console.log("connection failed to peer: " + myWs.url);
    sockets.splice(sockets.indexOf(myWs), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

const handleBlockchainResponse = (receivedBlocks: Block[]) => {
  if (receivedBlocks.length === 0) {
    console.log("received block chain size of 0");
    return;
  }
  const latestBlockReceived: Block = receivedBlocks[receivedBlocks.length - 1];
  if (!isValidBlockStructure(latestBlockReceived)) {
    console.log("block structure not valid");
    return;
  }
  const latestBlockHeld: Block = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      "blockchain possibly behind. We got: " +
        latestBlockHeld.index +
        " Peer got: " +
        latestBlockReceived.index
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcast(responseLatestMsg());
      }
    } else if (receivedBlocks.length === 1) {
      console.log("We have to query the chain from our peer");
      broadcast(queryAllMsg());
    } else {
      console.log("Received blockchain is longer than current blockchain");
      replaceChain(receivedBlocks);
      broadcastLatest();
    }
  } else {
    console.log(
      "received blockchain is not longer than received blockchain. Do nothing"
    );
  }
};

const broadcastLatest = (): void => {
  broadcast(responseLatestMsg());
};

const broadcastMempool = () => {
  broadcast(responseMempoolMsg());
};

const connectToPeer = (newPeer: string): void => {
  const ws: WebSocket = new WebSocket(newPeer);
  ws.on("open", () => {
    initConnection(ws);
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};

export {
  connectToPeer,
  broadcastLatest,
  broadcastMempool,
  initP2PServer,
  getSockets,
};
