// UI 렌더링 관련 함수들
class UI {
  // 블록체인 표시
  displayBlockchain(blockchain) {
    const container = document.getElementById("explorerBlockchainContainer");

    if (blockchain.length === 0) {
      container.innerHTML =
        '<div class="text-center text-gray-500">No blocks found</div>';
      return;
    }

    container.innerHTML = blockchain
      .map(
        (block) => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="text-lg font-semibold text-gray-800">Block #${
                block.index
              }</div>
              <div class="text-sm text-gray-500">
                ${new Date(block.timestamp * 1000).toLocaleString()}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">Difficulty: ${
                block.difficulty
              }</div>
              <div class="text-sm text-gray-600">Nonce: ${block.nonce}</div>
            </div>
          </div>
          
          <div class="space-y-2">
            <div>
              <span class="text-sm font-medium text-gray-700">Hash:</span>
              <div class="text-xs font-mono text-blue-600 break-all">${
                block.hash
              }</div>
            </div>
            
            <div>
              <span class="text-sm font-medium text-gray-700">Previous Hash:</span>
              <div class="text-xs font-mono text-gray-600 break-all">${
                block.previousHash || "Genesis Block"
              }</div>
            </div>
            
            <div>
              <span class="text-sm font-medium text-gray-700">Transactions: ${
                block.data.length
              }</span>
              ${
                block.data.length > 0
                  ? `
                <div class="mt-3 space-y-3">
                  ${block.data.map((tx) => this.renderTransaction(tx)).join("")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  // 트랜잭션 렌더링
  renderTransaction(tx) {
    return `
      <div class="bg-gray-50 p-3 rounded border">
        <div class="mb-2">
          <span class="text-xs font-medium text-gray-700">Transaction ID:</span>
          <div class="text-xs font-mono text-blue-600 break-all">${tx.id}</div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Inputs -->
          <div>
            <div class="text-xs font-medium text-gray-700 mb-1">Inputs (${
              tx.txIns.length
            }):</div>
            <div class="space-y-1">
              ${tx.txIns.map((txIn) => this.renderTxInput(txIn)).join("")}
            </div>
          </div>
          
          <!-- Outputs -->
          <div>
            <div class="text-xs font-medium text-gray-700 mb-1">Outputs (${
              tx.txOuts.length
            }):</div>
            <div class="space-y-1">
              ${tx.txOuts
                .map((txOut, index) => this.renderTxOutput(txOut, index))
                .join("")}
            </div>
          </div>
        </div>
        
        <div class="mt-2 pt-2 border-t border-gray-200">
          <div class="text-xs text-gray-500">
            <span class="font-medium">Total Output:</span> 
            <span class="font-bold text-green-600">${tx.txOuts.reduce(
              (sum, out) => sum + out.amount,
              0
            )} SC</span>
          </div>
        </div>
      </div>
    `;
  }

  // 트랜잭션 입력 렌더링
  renderTxInput(txIn) {
    return `
      <div class="text-xs bg-white p-2 rounded border">
        <div class="text-gray-600">
          <span class="font-medium">TxOut ID:</span> 
          ${txIn.txOutId ? txIn.txOutId.substring(0, 16) + "..." : "Coinbase"}
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Index:</span> ${txIn.txOutIndex}
        </div>
        ${
          txIn.signature
            ? `
          <div class="text-gray-600">
            <span class="font-medium">Signature:</span> ${txIn.signature.substring(
              0,
              30
            )}...
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // 트랜잭션 출력 렌더링
  renderTxOutput(txOut, index) {
    return `
      <div class="text-xs bg-white p-2 rounded border">
        <div class="text-gray-600">
          <span class="font-medium">Index:</span> ${index}
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Address:</span> 
          <div class="font-mono text-green-600 break-all">${txOut.address.substring(
            0,
            20
          )}...</div>
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Amount:</span> 
          <span class="font-bold text-green-600">${txOut.amount} SC</span>
        </div>
      </div>
    `;
  }

  // 메모리풀 표시
  displayMempool(mempool, page) {
    const containerId =
      page === "explorer"
        ? "explorerMempoolContainer"
        : "walletMempoolContainer";
    const container = document.getElementById(containerId);

    if (mempool.length === 0) {
      container.innerHTML =
        '<div class="text-center text-gray-500">Mempool is empty</div>';
      return;
    }

    container.innerHTML = mempool
      .map(
        (tx) => `
        <div class="border border-orange-200 bg-orange-50 rounded-lg p-3">
          <div class="mb-3">
            <div class="text-sm font-medium text-gray-800 mb-1">Pending Transaction</div>
            <div class="text-xs font-mono text-blue-600 break-all">${
              tx.id
            }</div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Inputs -->
            <div>
              <div class="text-xs font-medium text-gray-700 mb-1">Inputs (${
                tx.txIns.length
              }):</div>
              <div class="space-y-1">
                ${tx.txIns
                  .map((txIn) => this.renderMempoolTxInput(txIn))
                  .join("")}
              </div>
            </div>
            
            <!-- Outputs -->
            <div>
              <div class="text-xs font-medium text-gray-700 mb-1">Outputs (${
                tx.txOuts.length
              }):</div>
              <div class="space-y-1">
                ${tx.txOuts
                  .map((txOut, index) =>
                    this.renderMempoolTxOutput(txOut, index)
                  )
                  .join("")}
              </div>
            </div>
          </div>
          
          <div class="mt-3 pt-2 border-t border-orange-200">
            <div class="flex justify-between items-center">
              <div class="text-xs text-gray-600">
                <span class="font-medium">Status:</span> 
                <span class="text-orange-600 font-medium">⏳ Waiting for mining</span>
              </div>
              <div class="text-xs text-gray-600">
                <span class="font-medium">Total Output:</span> 
                <span class="font-bold text-green-600">${tx.txOuts
                  .reduce((sum, out) => sum + out.amount, 0)
                  .toFixed(2)} SC</span>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  // 메모리풀 트랜잭션 입력 렌더링
  renderMempoolTxInput(txIn) {
    return `
      <div class="text-xs bg-white p-2 rounded border">
        <div class="text-gray-600">
          <span class="font-medium">TxOut ID:</span> 
          ${txIn.txOutId ? txIn.txOutId.substring(0, 16) + "..." : "Coinbase"}
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Index:</span> ${txIn.txOutIndex}
        </div>
        ${
          txIn.signature
            ? `
          <div class="text-gray-600">
            <span class="font-medium">Signature:</span> ${txIn.signature.substring(
              0,
              20
            )}...
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // 메모리풀 트랜잭션 출력 렌더링
  renderMempoolTxOutput(txOut, index) {
    return `
      <div class="text-xs bg-white p-2 rounded border">
        <div class="text-gray-600">
          <span class="font-medium">Index:</span> ${index}
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Address:</span> 
          <div class="font-mono text-green-600 break-all">${txOut.address.substring(
            0,
            20
          )}...</div>
        </div>
        <div class="text-gray-600">
          <span class="font-medium">Amount:</span> 
          <span class="font-bold text-green-600">${txOut.amount} SC</span>
        </div>
      </div>
    `;
  }

  // 지갑 정보 업데이트
  updateWalletDisplay(balance, address) {
    const balanceElement = document.getElementById("walletPageBalance");
    const addressElement = document.getElementById("walletPageAddress");

    if (balanceElement) {
      balanceElement.textContent = `${balance.toFixed(2)} SC`;
    }
    if (addressElement) {
      addressElement.textContent = address;
    }
  }

  // 블록 하이라이트
  highlightBlock(block, blockchain) {
    const container = document.getElementById("explorerBlockchainContainer");
    const blockElements = container.children;

    // 기존 하이라이트 제거
    for (let i = 0; i < blockElements.length; i++) {
      blockElements[i].classList.remove("ring-2", "ring-blue-500");
    }

    // 매칭되는 블록 찾아서 하이라이트
    const blockIndex = blockchain.findIndex(
      (b) => b.hash === block.hash || b.index === block.index
    );
    if (blockIndex !== -1 && blockElements[blockIndex]) {
      blockElements[blockIndex].classList.add("ring-2", "ring-blue-500");
      blockElements[blockIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  // 토스트 알림 표시
  showToast(message, type = "info") {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const icon = icons[type] || icons.info;
    alert(`${icon} ${message}`);
  }
}

// UI 인스턴스를 전역으로 내보내기
window.ui = new UI();
