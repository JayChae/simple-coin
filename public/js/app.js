// 메인 애플리케이션 로직
class App {
  constructor() {
    this.blockchain = [];
    this.mempool = [];
    this.peers = [];
    this.walletBalance = 0;
    this.walletAddress = "";
    this.autoRefreshInterval = null;
  }

  // 애플리케이션 초기화
  async init() {
    try {
      await this.loadWalletInfo();

      // 현재 URL에 따른 초기 페이지 설정
      const initialPage = navigation.getPageFromURL();
      const currentPage = navigation.showPage(initialPage, false);

      // 페이지별 데이터 로드
      if (currentPage === "explorer") {
        await this.loadExplorerData();
      } else if (currentPage === "wallet") {
        await this.loadWalletData();
      }

      // 자동 새로고침 설정
      this.setupAutoRefresh();

      // 검색 입력 이벤트 리스너 설정
      this.setupSearchEventListeners();
    } catch (error) {
      console.error("Error initializing app:", error);
      ui.showToast("Error initializing application", "error");
    }
  }

  // 지갑 정보 로드
  async loadWalletInfo() {
    try {
      const walletInfo = await api.loadWalletInfo();
      this.walletBalance = walletInfo.balance;
      this.walletAddress = walletInfo.address;
    } catch (error) {
      ui.showToast("Error loading wallet information", "error");
      throw error;
    }
  }

  // 탐색기 데이터 로드
  async loadExplorerData() {
    await this.loadBlockchain();
    await this.loadMempool("explorer");
    await this.loadPeers("explorer");
  }

  // 지갑 데이터 로드
  async loadWalletData() {
    ui.updateWalletDisplay(this.walletBalance, this.walletAddress);
    await this.loadMempool("wallet");
    await this.loadPeers("wallet");
  }

  // 블록체인 로드
  async loadBlockchain() {
    try {
      this.blockchain = await api.loadBlockchain();
      ui.displayBlockchain(this.blockchain);
    } catch (error) {
      ui.showToast("Error loading blockchain", "error");
    }
  }

  // 메모리풀 로드
  async loadMempool(page) {
    try {
      this.mempool = await api.loadMempool();
      ui.displayMempool(this.mempool, page);
    } catch (error) {
      console.error("Error loading mempool:", error);
    }
  }

  // 연결된 peer 목록 로드
  async loadPeers(page) {
    try {
      this.peers = await api.loadPeers();
      ui.displayPeers(this.peers, page);
    } catch (error) {
      console.error("Error loading peers:", error);
    }
  }

  // 인덱스로 블록 검색
  async searchBlockByIndex() {
    const indexInput = document.getElementById("indexSearchInput");
    const index = parseInt(indexInput.value);

    if (isNaN(index)) {
      ui.showToast("Please enter a valid block index", "warning");
      return;
    }

    try {
      const block = await api.searchBlockByIndex(index);
      if (block) {
        ui.highlightBlock(block, this.blockchain);
        ui.showToast("Block found!", "success");
      } else {
        ui.showToast("Block not found", "warning");
      }
    } catch (error) {
      ui.showToast("Error searching block", "error");
    }
  }

  // 해시로 블록 검색
  async searchBlockByHash() {
    const hashInput = document.getElementById("hashSearchInput");
    const hash = hashInput.value.trim();

    if (!hash) {
      ui.showToast("Please enter a block hash", "warning");
      return;
    }

    try {
      const block = await api.searchBlockByHash(hash);
      if (block) {
        ui.highlightBlock(block, this.blockchain);
        ui.showToast("Block found!", "success");
      } else {
        ui.showToast("Block not found", "warning");
      }
    } catch (error) {
      ui.showToast("Error searching block", "error");
    }
  }

  // 지갑에서 트랜잭션 전송
  async sendTransactionFromWallet() {
    const addressInput = document.getElementById("walletRecipientAddress");
    const amountInput = document.getElementById("walletSendAmount");

    const address = addressInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!address || !amount || amount <= 0) {
      ui.showToast(
        "Please enter valid recipient address and amount",
        "warning"
      );
      return;
    }

    if (amount > this.walletBalance) {
      ui.showToast("Insufficient balance", "error");
      return;
    }

    try {
      await api.sendTransaction(address, amount);
      ui.showToast("Transaction sent successfully!", "success");

      // 폼 초기화
      addressInput.value = "";
      amountInput.value = "";

      // 데이터 새로고침
      await this.loadWalletInfo();
      await this.loadWalletData();
    } catch (error) {
      ui.showToast(`Transaction failed: ${error.message}`, "error");
    }
  }

  // 블록 마이닝
  async mineBlock() {
    const currentPage = navigation.getCurrentPage();
    const buttonId =
      currentPage === "explorer" ? "explorerMineButton" : "walletMineButton";
    const statusId =
      currentPage === "explorer"
        ? "explorerMiningStatus"
        : "walletMiningStatus";

    const button = document.getElementById(buttonId);
    const status = document.getElementById(statusId);

    // 버튼 비활성화 및 상태 표시
    button.disabled = true;
    button.textContent = "Mining...";
    status.classList.remove("hidden");

    try {
      const result = await api.mineBlock();
      ui.showToast(`Block #${result.index} mined successfully!`, "success");

      // 모든 데이터 새로고침
      await this.loadWalletInfo();
      if (currentPage === "explorer") {
        await this.loadExplorerData();
      } else if (currentPage === "wallet") {
        await this.loadWalletData();
      }
      // peer 정보 새로고침
      await this.loadPeers(currentPage);
    } catch (error) {
      ui.showToast(`Mining failed: ${error.message}`, "error");
    } finally {
      // 버튼 상태 복원
      button.disabled = false;
      button.textContent = "Mine Block";
      status.classList.add("hidden");
    }
  }

  // 자동 새로고침 설정
  setupAutoRefresh() {
    this.autoRefreshInterval = setInterval(async () => {
      try {
        await this.loadWalletInfo();
        const currentPage = navigation.getCurrentPage();

        if (currentPage === "explorer") {
          await this.loadBlockchain();
          await this.loadMempool("explorer");
          await this.loadPeers("explorer");
        } else if (currentPage === "wallet") {
          await this.loadMempool("wallet");
          await this.loadPeers("wallet");
        }
      } catch (error) {
        console.error("Error during auto refresh:", error);
      }
    }, 5000);
  }

  // 검색 입력 이벤트 리스너 설정
  setupSearchEventListeners() {
    const indexSearchInput = document.getElementById("indexSearchInput");
    const hashSearchInput = document.getElementById("hashSearchInput");

    if (indexSearchInput) {
      indexSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.searchBlockByIndex();
        }
      });
    }

    if (hashSearchInput) {
      hashSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.searchBlockByHash();
        }
      });
    }
  }

  // 애플리케이션 정리
  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }
}

// 전역 함수들 (HTML에서 호출되는 함수들)
function showPage(pageName) {
  const currentPage = navigation.showPage(pageName);

  // 페이지별 데이터 로드
  if (currentPage === "explorer") {
    app.loadExplorerData();
  } else if (currentPage === "wallet") {
    app.loadWalletData();
  }
}

function searchBlockByIndex() {
  app.searchBlockByIndex();
}

function searchBlockByHash() {
  app.searchBlockByHash();
}

function sendTransactionFromWallet() {
  app.sendTransactionFromWallet();
}

function mineBlock() {
  app.mineBlock();
}

// 애플리케이션 인스턴스 생성 및 초기화
let app;

document.addEventListener("DOMContentLoaded", async () => {
  app = new App();
  await app.init();
});
