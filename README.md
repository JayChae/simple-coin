# simple-coin

암호화폐 학습을 위한 간결하고 단순한 암호화폐 구현

[🔗 블록체인과 암호화폐 원리와 simple coin 구현 가이드]()

- simple blockchain
- simple proof of work
- simple transaction
- simple wallet
- simple mempool

---

  <img width="" height="" alt="image" src="https://github.com/user-attachments/assets/5f6acc1b-d28d-4f8c-a1b4-c4a09c27bc09" />

## 도커로 노드 3개 띄워서 체험하기(권장)

```
docker-compose up
```

<img width="" height="" alt="image" src="https://github.com/user-attachments/assets/ed55b633-2b26-4149-8b14-b7a69d517e99" />

### 구조

<img width="" height="" alt="image" src="https://github.com/user-attachments/assets/ee71ffa5-3caa-4b43-99d4-dda219e7bba2" />

#### 노드

http://localhost:3001 -> node1  
http://localhost:3002 -> node2  
http://localhost:3003 -> node3

## 빠른 실행

```
npm install
npm start
```

## explorer

블록체인 확인  
블록 검색  
mempool 확인  
블록 체굴 버튼

<img width="" height="" alt="image" src="https://github.com/user-attachments/assets/05d85944-5c1b-4f40-a347-672d875ef8d9" />

## wallet

잔고 확인  
주소 확인  
코인 보내기  
mempool 확인  
블록 체굴 버튼

<img width="" height="" alt="image" src="https://github.com/user-attachments/assets/9242ae2c-2be1-4e14-aea8-b8436afa91bf" />

## HTTP API

##### Get blockchain

```
curl http://localhost:3001/blocks
```

##### Mine a block

```
curl -X POST http://localhost:3001/mineBlock
```

##### Send transaction

```
curl -H "Content-type: application/json" --data '{"address": "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b", "amount" : 35}' http://localhost:3001/sendTransaction
```

##### Query transaction pool

```
curl http://localhost:3001/transactionPool
```

##### Mine transaction

```
curl -H "Content-type: application/json" --data '{"address": "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b", "amount" : 35}' http://localhost:3001/mineTransaction
```

##### Get balance

```
curl http://localhost:3001/balance
```

#### Query information about a specific address

```
curl http://localhost:3001/address/04f72a4541275aeb4344a8b049bfe2734b49fe25c08d56918f033507b96a61f9e3c330c4fcd46d0854a712dc878b9c280abe90c788c47497e06df78b25bf60ae64
```

##### Add peer

```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3001/addPeer
```

#### Query connected peers

```
curl http://localhost:3001/peers
```
