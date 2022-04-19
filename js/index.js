(function () {
  window.addEventListener("DOMContentLoaded", function () {
    let menuRootEl = document.querySelector(".nav-catalog_list ul");
    
    const resInfo = menuAim(menuRootEl, {
      activate: activateSubmenu,
      deactivate: deactivateSubmenu,
      activeRow: document.querySelector('[data-submenu-id="sm1"]'),
    });
    
    function overlayToggle() {
      const overlayEl = document.querySelector(".overlay");
      overlayEl.classList.toggle("show");
    }

    const btnCatalog = document.querySelector("#btnCatalog");
    if (btnCatalog) {
      btnCatalog.addEventListener("click", toggleCatalog);
    }

    function toggleCatalog(event) {
      event.preventDefault();
      event.target.querySelector(".icon-menu").classList.toggle("open");
      const navCatalog = document.querySelector("#navCatalog");
      const navTop = document.querySelector(".nav").getBoundingClientRect().top;
      const navHeight = document.querySelector(".nav").getBoundingClientRect().height;

      navCatalog.classList.toggle("show");
      navCatalog.style.top = `${navTop + navHeight}px`;

      overlayToggle();
    }

    function activateSubmenu(row) {
      let submenuId = row.dataset.submenuId;
      let submenu = document.querySelector(`#${submenuId}`);

      let styles = {
        display: "block",
      };
      if (submenu) Object.assign(submenu.style, styles);
      row.classList.add("show");
    }

    function deactivateSubmenu(row) {
      let submenuId = row.dataset.submenuId;
      let submenu = document.querySelector(`#${submenuId}`);

      let styles = {
        display: "none",
      };
      if (submenu) Object.assign(submenu.style, styles);
      [...submenu.querySelectorAll('.sub-expand.open')].forEach(span => span.click())
      row.classList.remove("show");
    }

    document.addEventListener("click", (e) => {
      const overlay = document.querySelector(".overlay");
      const navCatalog = document.querySelector("#navCatalog");
      const target = e.target;

      if (!target.closest("#navCatalog") && !target.closest("#btnCatalog")) {
        document
          .querySelector("#btnCatalog .icon-menu")
          .classList.remove("open");
        navCatalog.classList.remove("show");
        overlay.classList.remove("show");
      }
    });

    function addExpandButton(prevSubmenu) {
      const arrListSubcatalog = document.querySelectorAll(
        ".nav-catalog_sub-list"
      );

      arrListSubcatalog.forEach((list) => {
        const listArr = [...list.children];
        const lastItem = listArr[listArr.length - 1];
        
        if (listArr.length > 5) {
          const isExpand = lastItem.children[0].classList.contains('sub-expand')
          
          if (isExpand) return false;
          
          let stopItem = listArr[4];
          listArr.forEach(() => {
            stopItem.dataset.hideNext = "";
          });

          let li = document.createElement("li");
          let span = document.createElement("span");

          span.classList.add("sub-expand");
          span.innerHTML = "Еще";
          li.append(span);
          list.append(li);

          span.addEventListener("click", (event) => {
            let target = event.target;
            target.classList.toggle("open");
            stopItem.toggleAttribute("data-hide-next");
            if (target.classList.contains('open')) {
              target.textContent = "Свернуть";
            } else {
              target.textContent = "Еще";
            }
          });
        }
      });
    }
    addExpandButton();
  });
})();
