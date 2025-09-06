import express from "express";

const httpPort: number = parseInt(process.env.HTTP_PORT || "3001");
const p2pPort: number = parseInt(process.env.P2P_PORT || "6001");

const initHttpServer = (myHttpPort: number) => {
  const app = express();
  app.use(express.json());

  app.listen(myHttpPort, () => {
    console.log("Listening http on port: " + myHttpPort);
  });
};

initHttpServer(httpPort);
