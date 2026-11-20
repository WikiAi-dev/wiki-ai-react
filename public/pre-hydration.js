// Pre-hydration script: removes attributes that browser extensions inject
// (bis_skin_checked and similar) before React hydrates, so they do not cause
// hydration mismatches.
(function () {
  'use strict';

  function isExtensionAttr(name) {
    return !!name && (name.indexOf('bis_') !== -1 || name.indexOf('skin_checked') !== -1 || name.indexOf('processed_') !== -1 || name.indexOf('__processed') === 0);
  }

  function cleanElement(el) {
    if (!el || !el.attributes) return;
    for (var i = el.attributes.length - 1; i >= 0; i--) {
      var name = el.attributes[i].name;
      if (isExtensionAttr(name)) el.removeAttribute(name);
    }
  }

  function cleanTree(root) {
    cleanElement(root);
    var all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) cleanElement(all[i]);
  }

  // Run immediately and a few more times to catch early injections.
  cleanTree(document.documentElement);
  [0, 10, 50, 100, 500].forEach(function (ms) {
    setTimeout(function () {
      cleanTree(document.documentElement);
    }, ms);
  });

  // Watch for later injections. Only the changed element or the added subtree
  // is cleaned, never the whole document: pages change style and class
  // attributes on every animation frame, and a full scan per change made
  // scrolling stall.
  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          if (isExtensionAttr(m.attributeName)) m.target.removeAttribute(m.attributeName);
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            if (m.addedNodes[j].nodeType === 1) cleanTree(m.addedNodes[j]);
          }
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Hydration is over long before this; after it, extension attributes are harmless.
    window.addEventListener('load', function () {
      setTimeout(function () {
        observer.disconnect();
      }, 5000);
    });
  }
})();
