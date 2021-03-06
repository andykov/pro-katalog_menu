/**
 * menu-aim is a module to handle dropdown menus that can differentiate
 * between a user trying hover over a dropdown item vs trying to navigate into
 * a submenu's contents.
 *
 * menu-aim assumes that you have are using a menu with submenus that expand
 * to the menu's right. It will fire events when the user's mouse enters a new
 * dropdown item *and* when that item is being intentionally hovered over.
 *
 * __________________________
 * | Monkeys  >|   Gorilla  |
 * | Gorillas >|   Content  |
 * | Chimps   >|   Here     |
 * |___________|____________|
 *
 * In the above example, "Gorillas" is selected and its submenu content is
 * being shown on the right. Imagine that the user's cursor is hovering over
 * "Gorillas." When they move their mouse into the "Gorilla Content" area, they
 * may briefly hover over "Chimps." This shouldn't close the "Gorilla Content"
 * area.
 *
 * This problem is normally solved using timeouts and delays. menu-aim tries to
 * solve this by detecting the direction of the user's mouse movement. This can
 * make for quicker transitions when navigating up and down the menu. The
 * experience is hopefully similar to amazon.com/'s "Shop by Department"
 * dropdown.
 *
 * Use like so:
 *
 *      menuAim( document.querySelectorAll( "#menu" ), {
 *          activate: function () {},  // fired on row activation
 *          deactivate: function () {}  // fired on row deactivation
 *      } );
 *
 *  ...to receive events when a menu's row has been purposefully (de)activated.
 *
 * The following options can be passed to menuAim. All functions execute with
 * the relevant row's HTML element as the execution context ('this'):
 *
 *      menuAim( DOMEmenent, {
 *          // Function to call when a row is purposefully activated. Use this
 *          // to show a submenu's content for the activated row.
 *          activate: function() {},
 *
 *          // Set DOM node active, by that menu knows which elem should be
 *          // deactivated before first call to activate .
 *          // This param is useful when your menu has active row at default
 *          activeRow: null,
 *
 *          // Function to call when a row is deactivated.
 *          deactivate: function() {},
 *
 *          // Function to call when mouse enters a menu row. Entering a row
 *          // does not mean the row has been activated, as the user may be
 *          // mousing over to a submenu.
 *          enter: function() {},
 *
 *          // Function to call when mouse exits a menu row.
 *          exit: function() {},
 *
 *          // Selector for identifying which elements in the menu are rows
 *          // that can trigger the above events. If not defined, defaults to all first level child elements.
 *          // For Example:
 *          rowSelector: "#dropdown-menu-id > li",
 *
 *          // You may have some menu rows that aren't submenus and therefore
 *          // shouldn't ever need to "activate." If so, filter submenu rows w/
 *          // this selector. Defaults to "*" (all elements).
 *          submenuSelector: "*",
 *
 *          // Direction the submenu opens relative to the main menu. Can be
 *          // left, right, above, or below. Defaults to "right".
 *          submenuDirection: "right"
 *      });
 *
 *
 * A few performance improvements and release of jQuery dependency by the Wikia
 * https://github.com/Wikia/js-menu-aim
 * git@github.com:Wikia/js-menu-aim.git
 *
 * forked from: https://github.com/kamens/jQuery-menu-aim
 *
 * Works on IE9+ (because of addEventListener...)
 */
(() => {
  let menuAimModule;
  let sharedProperties;
  let utils;

  /**
   * Properties that will be shared through the instances of the class - just like in singleton.
   * @type {Object}
   */
  sharedProperties = {
    mouseLocs: [],
    mousemoveTracked: false,
  };

  /**
   * Additional functions to help module to work.
   */
  utils = {
    /**
     * Returns only the elements filtered by the filterSelector
     * @param  {Array} elements - DOM elements to be filtered
     * @param  {String} filterSelector - selector to filter DOM elements
     * @return {Array} filtered DOM elements
     */
    filter(elements, filterSelector) {
      let elementsCnt;
      let elementNo;
      let nodeList;
      let nodeListCnt;
      let nodeNo;
      let result;

      result = [];
      elementsCnt = elements.length;

      for (elementNo = 0; elementNo < elementsCnt; ++elementNo) {
        if (!elements[elementNo] || !elements[elementNo].parentNode) {
          continue;
        }

        nodeList =
          elements[elementNo].parentNode.querySelectorAll(filterSelector);
        nodeListCnt = nodeList.length;

        for (nodeNo = 0; nodeNo < nodeListCnt; ++nodeNo) {
          if (nodeList[nodeNo] !== elements[elementNo]) {
            continue;
          }

          result.push(elements[elementNo]);
        }
      }

      return result;
    },

    /**
     * Returns first object extended by the properties of the second
     * @param  {Object} dst Object to be extended
     * @param  {Object} src Object with properties that should be added to the previous
     * @return {Object} Extended object
     */
    extend(dst, src) {
      let p;

      for (p in src) {
        if (src.hasOwnProperty(p)) {
          dst[p] = src[p];
        }
      }

      return dst;
    },

    // Detect if the user is moving towards the currently activated
    // submenu.
    //
    // If the mouse is heading relatively clearly towards
    // the submenu's content, we should wait and give the user more
    // time before activating a new row. If the mouse is heading
    // elsewhere, we can immediately activate a new row.
    //
    // We detect this by calculating the slope formed between the
    // current mouse location and the upper/lower right points of
    // the menu. We do the same for the previous mouse location.
    // If the current mouse location's slopes are
    // increasing/decreasing appropriately compared to the
    // previous's, we know the user is moving toward the submenu.
    //
    // Note that since the y-axis increases as the cursor moves
    // down the screen, we are looking for the slope between the
    // cursor and the upper right corner to decrease over time, not
    // increase (somewhat counterintuitively).
    slope(a, b) {
      return (b.y - a.y) / (b.x - a.x);
    },
  };

  menuAimModule = function () {
    let DELAY;
    let MOUSE_LOCS_TRACKED;
    let activeRow;
    let lastDelayLoc;
    let mouseLocs;
    let menu;
    let options;
    let timeoutId;
    let activate;
    let activationDelay;
    let clickRow;
    let mouseenterRow;
    let mouseenterMenu;
    let mouseleaveMenu;
    let mouseleaveRow;
    let mousemoveDocument;
    let possiblyActivate;
    let mouseMoveTrackerOff;
    let mouseMoveTrackerOn;

    lastDelayLoc = null;
    timeoutId = null;
    mouseLocs = sharedProperties.mouseLocs;

    options = {
      activeRow: null,
      rowSelector: null,
      submenuSelector: "*",
      submenuDirection: "right",
      tolerance: 75, // bigger = more forgivey when entering submenu
      enter: Function.prototype,
      exit: Function.prototype,
      activate: Function.prototype,
      deactivate: Function.prototype,
      exitMenu: Function.prototype,
    };

    MOUSE_LOCS_TRACKED = 3; // number of past mouse locations to track
    DELAY = 300; // ms delay when user appears to be entering submenu

    /**
     * Hook up initial menu events
     */
    this.init = function (menuToHandle, opts) {
      let i;
      let j;
      let rows;

      menu = menuToHandle;
      options = utils.extend(options, opts);
      activeRow = options.activeRow;

      menu.addEventListener("mouseleave", mouseleaveMenu);
      menu.addEventListener("mouseenter", mouseenterMenu);

      if (!options.rowSelector) {
        rows = menu.childNodes;
      } else {
        rows = menu.querySelectorAll(options.rowSelector);
      }

      for (i = 0, j = rows.length; i < j; ++i) {
        rows[i].addEventListener("mouseenter", mouseenterRow);
        rows[i].addEventListener("mouseleave", mouseleaveRow);
        rows[i].addEventListener("click", clickRow);
      }

      return this;
    };

    /**
     * Resets active row to initial state - active row set in menu AIM constructor options
     */
    this.resetActiveRow = () => {
      activeRow = options.activeRow;
    };

    /**
     * Tracking of mouse pointer - shared between instances. And bound just one for all instances.
     * Only for devices without touchscreen.
     */
    mouseMoveTrackerOn = () => {
      if (!sharedProperties.mousemoveTracked && !window.touchstart) {
        document.addEventListener("mousemove", mousemoveDocument);
        sharedProperties.mousemoveTracked = true;
      }
    };

    /**
     * Turn off tracking of mouse pointer.
     */
    mouseMoveTrackerOff = () => {
      if (sharedProperties.mousemoveTracked) {
        document.removeEventListener("mousemove", mousemoveDocument);
        sharedProperties.mousemoveTracked = false;
      }
    };

    /**
     * Keep track of the last few locations of the mouse.
     */
    mousemoveDocument = ({ pageX, pageY }) => {
      mouseLocs.push({ x: pageX, y: pageY });

      if (mouseLocs.length > MOUSE_LOCS_TRACKED) {
        mouseLocs.shift();
      }
    };

    /**
     * Cancel possible row activations when leaving the menu entirely.
     * Also cancel mouse pointer position tracking.
     */
    mouseleaveMenu = function () {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // If exitMenu is supplied and returns true, deactivate the
      // currently active row on menu exit.
      if (activeRow && options.exitMenu(this)) {
        options.deactivate(activeRow);
        activeRow = null;
      }

      mouseMoveTrackerOff();
    };

    /**
     * Turn on tracking of mouse pointer position.
     */
    mouseenterMenu = () => {
      mouseMoveTrackerOn();
    };

    /**
     * Trigger a possible row activation whenever entering a new row.
     */
    mouseenterRow = function () {
      if (timeoutId) {
        // Cancel any previous activation delays
        clearTimeout(timeoutId);
      }

      options.enter(this);
      possiblyActivate(this);
    };

    /**
     * Trigger a possible row deactivation whenever leaving a row.
     */
    mouseleaveRow = function () {
      options.exit(this);
    };

    /**
     * Immediately activate a row if the user clicks on it.
     * @param {Event} event
     */
    clickRow = function (event) {
      activate(this, event);
    };

    /**
     * Activate a menu row.
     * @oaram {Element} row - menu row that triggered the event
     * @param {Event=} event - click event from clickRow handler
     */
    activate = (row, event) => {
      if (row === activeRow) {
        return;
      }

      if (activeRow) {
        options.deactivate(activeRow, event);
      }

      options.activate(row, event);
      activeRow = row;
    };

    /**
     * Possibly activate a menu row. If mouse movement indicates that we
     * shouldn't activate yet because user may be trying to enter
     * a submenu's content, then delay and check again later.
     */
    possiblyActivate = (row) => {
      const delay = activationDelay();

      if (delay) {
        timeoutId = setTimeout(() => {
          possiblyActivate(row);
        }, delay);
      } else {
        activate(row);
      }
    };

    /**
     * Return the amount of time that should be used as a delay before the
     * currently hovered row is activated.
     *
     * Returns 0 if the activation should happen immediately. Otherwise,
     * returns the number of milliseconds that should be delayed before
     * checking again to see if the row should be activated.
     */
    activationDelay = () => {
      let offset;
      let upperLeft;
      let upperRight;
      let lowerLeft;
      let lowerRight;
      let loc;
      let prevLoc;
      let decreasingCorner;
      let increasingCorner;
      let decreasingSlope;
      let increasingSlope;
      let prevDecreasingSlope;
      let prevIncreasingSlope;

      if (
        !activeRow ||
        (options.submenuSelector !== "*" &&
          utils.filter([activeRow], options.submenuSelector).length === 0)
      ) {
        // If there is no other submenu row already active, then
        // go ahead and activate immediately.
        return 0;
      }
      offset = menu.getBoundingClientRect();

      upperLeft = {
        x: offset.left,
        y: offset.top + window.pageYOffset - options.tolerance,
      };
      upperRight = {
        x: offset.left + menu.offsetWidth,
        y: upperLeft.y,
      };
      lowerLeft = {
        x: offset.left,
        y:
          offset.top +
          window.pageYOffset +
          menu.offsetHeight +
          options.tolerance,
      };
      lowerRight = {
        x: offset.left + menu.offsetWidth,
        y: lowerLeft.y,
      };
      loc = mouseLocs[mouseLocs.length - 1];
      prevLoc = mouseLocs[0];

      if (!loc) {
        return 0;
      }

      if (!prevLoc) {
        prevLoc = loc;
      }

      if (
        prevLoc.x < offset.left ||
        prevLoc.x > lowerRight.x ||
        prevLoc.y < offset.top ||
        prevLoc.y > lowerRight.y
      ) {
        // If the previous mouse location was outside of the entire
        // menu's bounds, immediately activate.
        return 0;
      }

      if (
        lastDelayLoc &&
        loc.x === lastDelayLoc.x &&
        loc.y === lastDelayLoc.y
      ) {
        // If the mouse hasn't moved since the last time we checked
        // for activation status, immediately activate.
        return 0;
      }

      decreasingCorner = upperRight;
      increasingCorner = lowerRight;

      // Our expectations for decreasing or increasing slope values
      // depends on which direction the submenu opens relative to the
      // main menu. By default, if the menu opens on the right, we
      // expect the slope between the cursor and the upper right
      // corner to decrease over time, as explained above. If the
      // submenu opens in a different direction, we change our slope
      // expectations.
      if (options.submenuDirection === "left") {
        decreasingCorner = lowerLeft;
        increasingCorner = upperLeft;
      } else if (options.submenuDirection === "below") {
        decreasingCorner = lowerRight;
        increasingCorner = lowerLeft;
      } else if (options.submenuDirection === "above") {
        decreasingCorner = upperLeft;
        increasingCorner = upperRight;
      }

      decreasingSlope = utils.slope(loc, decreasingCorner);
      increasingSlope = utils.slope(loc, increasingCorner);
      prevDecreasingSlope = utils.slope(prevLoc, decreasingCorner);
      prevIncreasingSlope = utils.slope(prevLoc, increasingCorner);

      if (
        decreasingSlope < prevDecreasingSlope &&
        increasingSlope > prevIncreasingSlope
      ) {
        // Mouse is moving from previous location towards the
        // currently activated submenu. Delay before activating a
        // new menu row, because user may be moving into submenu.
        lastDelayLoc = loc;
        return DELAY;
      }

      lastDelayLoc = null;
      return 0;
    };
  };

  window.menuAim = (menuToHandle, opts) => {
    let menuAim;

    menuAim = new menuAimModule();
    return menuAim.init(menuToHandle, opts);
  };
})();
