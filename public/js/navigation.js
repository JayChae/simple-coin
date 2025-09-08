// 페이지 네비게이션 관련 함수들
class Navigation {
  constructor() {
    this.currentPage = "home";
    this.setupEventListeners();
  }

  // 페이지 표시 (URL 라우팅 포함)
  showPage(pageName, updateHistory = true) {
    // 모든 페이지 숨기기
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    // 선택된 페이지 표시
    document.getElementById(pageName + "Page").classList.add("active");

    // 네비게이션 버튼 업데이트
    this.updateNavigationButtons(pageName);

    this.currentPage = pageName;

    // URL 업데이트
    if (updateHistory) {
      const url = pageName === "home" ? "/" : `/${pageName}`;
      window.history.pushState({ page: pageName }, "", url);
    }

    // 페이지 제목 업데이트
    this.updatePageTitle(pageName);

    return pageName;
  }

  // 네비게이션 버튼 업데이트
  updateNavigationButtons(pageName) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("bg-gray-200", "text-gray-800", "font-semibold");
      btn.classList.add(
        "text-gray-600",
        "hover:text-gray-800",
        "hover:bg-gray-100"
      );
    });

    const activeBtn = document.querySelector(`[data-page="${pageName}"]`);
    if (activeBtn) {
      activeBtn.classList.remove(
        "text-gray-600",
        "hover:text-gray-800",
        "hover:bg-gray-100"
      );
      activeBtn.classList.add("bg-gray-200", "text-gray-800", "font-semibold");
    }
  }

  // 페이지 제목 업데이트
  updatePageTitle(pageName) {
    const titles = {
      home: "Simple Coin",
      explorer: "Simple Coin - Explorer",
      wallet: "Simple Coin - Wallet",
    };
    document.title = titles[pageName] || "Simple Coin";
  }

  // 브라우저 뒤로/앞으로 버튼 처리
  handlePopState(event) {
    const page = event.state ? event.state.page : this.getPageFromURL();
    this.showPage(page, false);
  }

  // 현재 URL에서 페이지 추출
  getPageFromURL() {
    const path = window.location.pathname;
    if (path === "/") return "home";
    if (path === "/explorer") return "explorer";
    if (path === "/wallet") return "wallet";
    return "home"; // 기본값
  }

  // 이벤트 리스너 설정
  setupEventListeners() {
    // 브라우저 뒤로/앞으로 버튼 이벤트
    window.addEventListener("popstate", (event) => this.handlePopState(event));
  }

  // 현재 페이지 반환
  getCurrentPage() {
    return this.currentPage;
  }
}

// Navigation 인스턴스를 전역으로 내보내기
window.navigation = new Navigation();
