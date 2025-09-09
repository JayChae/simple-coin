// API 통신 관련 함수들
class API {
  constructor() {
    this.baseURL = window.location.origin;
  }

  // 지갑 정보 로드
  async loadWalletInfo() {
    try {
      const [balanceRes, addressRes] = await Promise.all([
        fetch(`${this.baseURL}/balance`),
        fetch(`${this.baseURL}/address`),
      ]);

      const balanceData = await balanceRes.json();
      const addressData = await addressRes.json();

      return {
        balance: balanceData.balance,
        address: addressData.address,
      };
    } catch (error) {
      console.error("Error loading wallet info:", error);
      throw error;
    }
  }

  // 블록체인 로드
  async loadBlockchain() {
    try {
      const response = await fetch(`${this.baseURL}/blocks`);
      return await response.json();
    } catch (error) {
      console.error("Error loading blockchain:", error);
      throw error;
    }
  }

  // 메모리풀 로드
  async loadMempool() {
    try {
      const response = await fetch(`${this.baseURL}/mempool`);
      return await response.json();
    } catch (error) {
      console.error("Error loading mempool:", error);
      throw error;
    }
  }

  // 인덱스로 블록 검색
  async searchBlockByIndex(index) {
    try {
      const response = await fetch(`${this.baseURL}/block/index/${index}`);
      return await response.json();
    } catch (error) {
      console.error("Error searching block:", error);
      throw error;
    }
  }

  // 해시로 블록 검색
  async searchBlockByHash(hash) {
    try {
      const response = await fetch(`${this.baseURL}/block/hash/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error searching block:", error);
      throw error;
    }
  }

  // 트랜잭션 전송
  async sendTransaction(address, amount) {
    try {
      const response = await fetch(`${this.baseURL}/sendTransaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  // 블록 마이닝
  async mineBlock() {
    try {
      const response = await fetch(`${this.baseURL}/mineBlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return await response.json();
    } catch (error) {
      console.error("Error mining block:", error);
      throw error;
    }
  }

  // 연결된 peer 목록 로드
  async loadPeers() {
    try {
      const response = await fetch(`${this.baseURL}/peers`);
      return await response.json();
    } catch (error) {
      console.error("Error loading peers:", error);
      throw error;
    }
  }
}

// API 인스턴스를 전역으로 내보내기
window.api = new API();
