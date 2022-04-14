export const classToggler = (function () {
  const init = (opt) => {
    // this.opt = { ...this.defaultOpt, ...opt };
    // this.initClick();
    // this.initAbort();
    // this.initFocus();
    // this.initGroup();
    // this.initTabs();
    console.log(this);
  };

  const getOffsetTopNav = () => {
    const nav = document.querySelector(".nav");
    const navPos = nav.getBoundingClientRect().top;
    // console.log(navPos);
    return `${navPos}px`;
  };
  getOffsetTopNav();

  const btnCatalog = document.querySelector("#btnCatalog");
  const navCatalog = document.querySelector("#navCatalog");
  const handleToggle = (e) => {
    e.preventDefault();
    navCatalog.classList.toggle("show");
    navCatalog.style.top = getOffsetTopNav();
  };

  if (btnCatalog && navCatalog) {
    btnCatalog.addEventListener("click", handleToggle);
  }

  function setOffsetTopNavCatalog() {
    return document.querySelector(".nav").getBoundingClientRect().top;
    // const navPos = nav.getBoundingClientRect().top;
  }
})();
